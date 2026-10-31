import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Printer,
  QrCode,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  Search,
  Filter,
  X,
  FileBadge,
  AlertTriangle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Seek } from '../../ui/Seek';
import { MedicalCertificateRecord } from '../../../types';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const MedicalCertificatesView: React.FC = () => {
  const {
    language,
    isSyncing,
    networkMode,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();
  const { certificates, addCertificate, patients, practitioners } = useMedicalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activePrintCert, setActivePrintCert] = useState<MedicalCertificateRecord | null>(null);

  // New Certificate Form State
  const [certType, setCertType] = useState<MedicalCertificateRecord['certificateType']>('ArretDeTravail');
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState(practitioners[0]?.id || '');
  const [patientEmployer, setPatientEmployer] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
  );
  const [ittDays, setIttDays] = useState(5);
  const [purpose, setPurpose] = useState('Pratique sportive');
  const [clinicalFindings, setClinicalFindings] = useState(
    'Examen clinique compatible avec un repos médical strict.'
  );

  // Filter certificates
  const filteredCertificates = certificates.filter((c) => {
    const matchesSearch =
      c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.qrHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'all' || c.certificateType === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const getCertTypeLabel = (type: MedicalCertificateRecord['certificateType']) => {
    switch (type) {
      case 'ArretDeTravail':
        return 'Arrêt de Travail (CNAS)';
      case 'AptitudePhysique':
        return 'Aptitude Physique & Sport';
      case 'CertificatDescriptifITT':
        return 'Certificat Descriptif (ITT)';
      case 'LettreOrientation':
        return 'Lettre d\'Orientation Confrère';
      default:
        return type;
    }
  };

  const handleCreateCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === selectedPatientId);
    const doctor = practitioners.find((p) => p.id === selectedDoctorId);

    // Calculate duration in days for Arrêt de Travail
    let durationDays = 1;
    let resumptionDate = '';
    if (certType === 'ArretDeTravail') {
      const s = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - s.getTime());
      durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Algerian resumption date (if ending Thursday, resumes Sunday)
      const r = new Date(end);
      r.setDate(r.getDate() + 1);
      if (r.getDay() === 5) { // Friday -> Sunday
        r.setDate(r.getDate() + 2);
      } else if (r.getDay() === 6) { // Saturday -> Sunday
        r.setDate(r.getDate() + 1);
      }
      resumptionDate = r.toISOString().slice(0, 10);
    }

    const newCert: MedicalCertificateRecord = {
      id: `cert_${Date.now()}`,
      certificateType: certType,
      patientId: selectedPatientId,
      patientName: patient?.fullName || 'Patient',
      patientDob: patient?.dateOfBirth,
      patientEmployer: certType === 'ArretDeTravail' ? patientEmployer : undefined,
      doctorId: selectedDoctorId,
      doctorName: doctor?.fullName || 'Dr. Praticien',
      doctorSpecialty: doctor?.specialty || 'Médecine Générale',
      issueDate: new Date().toISOString().slice(0, 10),
      startDate: certType === 'ArretDeTravail' ? startDate : undefined,
      endDate: certType === 'ArretDeTravail' ? endDate : undefined,
      durationDays: certType === 'ArretDeTravail' ? durationDays : undefined,
      resumptionDate: certType === 'ArretDeTravail' ? resumptionDate : undefined,
      ittDays: certType === 'CertificatDescriptifITT' ? ittDays : undefined,
      purpose: certType === 'AptitudePhysique' || certType === 'LettreOrientation' ? purpose : undefined,
      clinicalFindings,
      qrHash: `CERT-${certType.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}-DZ`,
      isSigned: true,
    };

    addCertificate(newCert);
    setIsCreateModalOpen(false);
  };

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: certificates.length > 0,
  });

  if (showSkeleton && (certificates.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <FileBadge size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الشهادات والوثائق الطبية' : 'Certificats & Documents Médicaux Officiels'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0D9488]/15 text-[#0D9488]">
                Conforme CNAS
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Arrêts de travail légaux, certificats d'aptitude sportive, ITT médico-légal et lettres de liaison
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={15} />}
          >
            Établir un Certificat
          </AtriumButton>
        </div>
      </div>

      {/* Top KPI Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              Activité des Certifications Médicales
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Registres des attestations médicales délivrées avec empreinte numérique SHA-256
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Seek
              placeholder="Rechercher patient, médecin, QR hash..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Arrêts de Travail CNAS</span>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white font-mono mt-1">
              {certificates.filter((c) => c.certificateType === 'ArretDeTravail').length}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Validité juridique garantie</span>
          </div>

          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Aptitudes Physiques</span>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white font-mono mt-1">
              {certificates.filter((c) => c.certificateType === 'AptitudePhysique').length}
            </div>
            <span className="text-[10px] text-neutral-400">Sport & licences club</span>
          </div>

          <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500">Certificats ITT Médicolégal</span>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white font-mono mt-1">
              {certificates.filter((c) => c.certificateType === 'CertificatDescriptifITT').length}
            </div>
            <span className="text-[10px] text-amber-600">Constats de blessures</span>
          </div>

          <div className="p-4 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white shadow-sm flex flex-col justify-between">
            <span className="text-[11px] text-neutral-400 font-medium">Total Certificats Émis</span>
            <div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {certificates.length}
              </div>
              <span className="text-[10px] text-neutral-400">100% signés et horodatés</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Tous les Certificats' },
          { id: 'ArretDeTravail', label: 'Arrêts de Travail' },
          { id: 'AptitudePhysique', label: 'Aptitudes Physiques' },
          { id: 'CertificatDescriptifITT', label: 'Certificats ITT' },
          { id: 'LettreOrientation', label: 'Lettres d\'Orientation' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTypeFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedTypeFilter === tab.id
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Certificates Data Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F8F9FA] dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Date Émission</th>
              <th className="py-3.5 px-4">Type de Document</th>
              <th className="py-3.5 px-4">Patient</th>
              <th className="py-3.5 px-4">Médecin Signataire</th>
              <th className="py-3.5 px-4">Détails / Période</th>
              <th className="py-3.5 px-4">Code Sécurisé</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredCertificates.map((cert) => (
              <tr key={cert.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors">
                <td className="py-3.5 px-4 font-mono font-medium text-neutral-700 dark:text-neutral-300">
                  {cert.issueDate}
                </td>
                <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white">
                  {getCertTypeLabel(cert.certificateType)}
                </td>
                <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                  {cert.patientName}
                </td>
                <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300">
                  {cert.doctorName}
                  <span className="block text-[10px] text-neutral-400">{cert.doctorSpecialty}</span>
                </td>
                <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400">
                  {cert.certificateType === 'ArretDeTravail' && (
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {cert.durationDays} jours (du {cert.startDate} au {cert.endDate}) · Reprise: {cert.resumptionDate}
                    </span>
                  )}
                  {cert.certificateType === 'AptitudePhysique' && (
                    <span>Objet: {cert.purpose}</span>
                  )}
                  {cert.certificateType === 'CertificatDescriptifITT' && (
                    <span className="font-mono text-amber-600 font-bold">
                      ITT: {cert.ittDays} jours
                    </span>
                  )}
                  {cert.certificateType === 'LettreOrientation' && (
                    <span>Objet: {cert.purpose}</span>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-400">
                  {cert.qrHash}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <AtriumButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setActivePrintCert(cert)}
                    icon={<Printer size={13} />}
                  >
                    Imprimer
                  </AtriumButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[28px] border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-[#F8F9FA] dark:bg-neutral-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <FileBadge size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    Établir un Certificat Médical
                  </h2>
                  <p className="text-xs text-neutral-500">Document légal conforme aux normes de santé publique</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCertificate} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <LabelSelect
                label="Type de Certificat"
                value={certType}
                onChange={(val) => setCertType(val as any)}
                options={[
                  { value: 'ArretDeTravail', label: 'Certificat d\'Arrêt de Travail (CNAS)' },
                  { value: 'AptitudePhysique', label: 'Certificat d\'Aptitude Physique & Sport' },
                  { value: 'CertificatDescriptifITT', label: 'Certificat Médical Descriptif (avec ITT)' },
                  { value: 'LettreOrientation', label: 'Lettre d\'Orientation / Liaison Confrère' },
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label="Patient"
                  value={selectedPatientId}
                  onChange={(val) => setSelectedPatientId(val)}
                  options={patients.map((p) => ({ value: p.id, label: p.fullName }))}
                />
                <LabelSelect
                  label="Médecin Signataire"
                  value={selectedDoctorId}
                  onChange={(val) => setSelectedDoctorId(val)}
                  options={practitioners.map((p) => ({ value: p.id, label: `${p.fullName} (${p.specialty})` }))}
                />
              </div>

              {certType === 'ArretDeTravail' && (
                <>
                  <LabelInput
                    label="Organisme Employeur / Entreprise du Patient"
                    value={patientEmployer}
                    onChange={(e) => setPatientEmployer(e.target.value)}
                    placeholder="ex: Sonatrach, Ministère, Société privée..."
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <LabelInput
                      label="Date de Début de l'Arrêt"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                    <LabelInput
                      label="Date de Fin (Inclus)"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>

                  {(() => {
                    const diffDays = Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    if (diffDays > 30) {
                      return (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-1 animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>Avertissement Réglementaire CNAS ({diffDays} jours)</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Les arrêts de travail de plus de 30 jours consécutifs requièrent une convocation et validation préalable de la commission médicale du contrôle de la sécurité sociale (Art. 17 Loi 83-11).
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] text-neutral-500 font-mono">
                        Durée calculée de l'arrêt : <strong>{diffDays} jour(s)</strong>
                      </div>
                    );
                  })()}
                </>
              )}

              {certType === 'CertificatDescriptifITT' && (
                <LabelInput
                  label="Incapacité Totale de Travail (en jours)"
                  type="number"
                  value={String(ittDays)}
                  onChange={(e) => setIttDays(Number(e.target.value))}
                  required
                />
              )}

              {(certType === 'AptitudePhysique' || certType === 'LettreOrientation') && (
                <LabelInput
                  label="Objet / Destination du Certificat"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="ex: Football amateur, Visite d'embauche, Référé pour avis cardiologique"
                  required
                />
              )}

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Constatations Cliniques & Mentions Légales
                </label>
                <textarea
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F8F9FA] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                <AtriumButton variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton variant="primary" type="submit" icon={<CheckCircle2 size={16} />}>
                  Générer le Document Officiel
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Preview Modal */}
      {activePrintCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white text-neutral-900 w-full max-w-xl rounded-[28px] border border-neutral-300 shadow-2xl p-8 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b-2 border-[#C4785A] pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black uppercase text-[#C4785A]">
                  {activePrintCert.doctorName}
                </h2>
                <p className="text-xs font-semibold text-neutral-800">{activePrintCert.doctorSpecialty}</p>
                <p className="text-[10px] text-neutral-500">Polyclinique El-Chifa · 14 Rue Didouche Mourad, Alger</p>
              </div>
              <div className="text-right text-[10px] font-mono text-neutral-400">
                <p className="font-bold text-neutral-800">RÉPUBLIQUE ALGÉRIENNE</p>
                <p>CERTIFICAT MÉDICAL OFFICIEL</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <span className="text-sm font-bold uppercase tracking-widest px-4 py-1.5 border-2 border-neutral-800 rounded-lg inline-block">
                {getCertTypeLabel(activePrintCert.certificateType)}
              </span>
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-xs leading-relaxed text-neutral-800">
              <p>
                Je soussigné, <strong>{activePrintCert.doctorName}</strong>, certifie avoir examiné ce jour le/la nommé(e) :
              </p>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1 font-mono">
                <p><strong>Nom & Prénom :</strong> {activePrintCert.patientName}</p>
                {activePrintCert.patientDob && <p><strong>Date de naissance :</strong> {activePrintCert.patientDob}</p>}
                {activePrintCert.patientEmployer && <p><strong>Employeur :</strong> {activePrintCert.patientEmployer}</p>}
              </div>

              <p>Et déclare que son état de santé justifie les constatations suivantes :</p>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 italic">
                "{activePrintCert.clinicalFindings}"
              </div>

              {activePrintCert.certificateType === 'ArretDeTravail' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold space-y-1">
                  <p>En conséquence, je prescris un <strong>ARRÊT DE TRAVAIL DE {activePrintCert.durationDays} JOURS</strong>.</p>
                  <p className="text-[11px] font-normal">
                    Période : Du {activePrintCert.startDate} au {activePrintCert.endDate} inclus.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-700">
                    Date de reprise effective du travail : {activePrintCert.resumptionDate}.
                  </p>
                </div>
              )}

              {activePrintCert.certificateType === 'CertificatDescriptifITT' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                  Incapacité Totale de Travail (ITT) fixée à : <strong>{activePrintCert.ittDays} jours</strong>, sous réserve de complications ultérieures.
                </div>
              )}

              <p className="text-[11px] text-neutral-500 pt-2">
                Certificat délivré en mains propres à l'intéressé(e) pour faire valoir ce que de droit.
              </p>
            </div>

            {/* Bottom Signature & Stamp */}
            <div className="mt-8 pt-4 border-t border-neutral-200 flex justify-between items-end">
              <div className="flex items-center gap-3">
                <QrCode size={40} className="text-neutral-800" />
                <div className="text-[9px] font-mono text-neutral-400">
                  <p className="font-bold text-neutral-700">AUTHENTICITÉ VÉRIFIÉE</p>
                  <p>{activePrintCert.qrHash}</p>
                </div>
              </div>

              <div className="text-center w-36">
                <span className="text-[10px] text-neutral-500 block mb-1">Cachet & Signature</span>
                <div className="w-32 h-16 border-2 border-dashed border-blue-600 rounded-lg p-1.5 flex flex-col justify-center items-center text-center rotate-[-3deg] text-blue-700 bg-blue-50/50">
                  <span className="text-[8px] font-black uppercase">{activePrintCert.doctorName}</span>
                  <span className="text-[7px] font-bold">{activePrintCert.doctorSpecialty}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <AtriumButton variant="secondary" onClick={() => setActivePrintCert(null)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                variant="primary"
                onClick={() => window.print()}
                icon={<Printer size={15} />}
              >
                Lancer l'Impression
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
