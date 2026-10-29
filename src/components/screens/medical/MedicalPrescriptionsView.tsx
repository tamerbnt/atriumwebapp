import React, { useState, useMemo } from 'react';
import {
  Pill,
  Printer,
  FileText,
  CheckCircle2,
  QrCode,
  Download,
  Pin,
  X,
  UserCheck,
  ShieldCheck,
  Plus,
  AlertTriangle,
  Clock,
  Calendar,
  Settings,
  ShieldAlert,
  User,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { MedicalPrescription, MedicalPrescriptionItem, DoctorOrdonnanceConfig } from '../../../types';
import { useMedicalData, NGAP_ACTS } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { MedicalOrdonnancePersonalizerModal } from './MedicalOrdonnancePersonalizerModal';

export const MedicalPrescriptionsView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    prescriptions,
    patients,
    practitioners,
    doctorConfigs,
    updateDoctorConfig,
    addPrescription,
    depleteForAct,
  } = useMedicalData();

  const [activeMainTab, setActiveMainTab] = useState<'prescriptions' | 'ngap'>('prescriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'recent' | 'multi'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('prescriptionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['rx_01']));
  const [selectedRx, setSelectedRx] = useState<MedicalPrescription | null>(() => prescriptions[0] || null);
  const [activeTab, setActiveTab] = useState<'posologie' | 'securite' | 'actions' | 'apercu'>('posologie');

  // Ordonnance Personalizer Modal State
  const [isPersonalizerOpen, setIsPersonalizerOpen] = useState(false);
  const [activeDoctorId, setActiveDoctorId] = useState<string>(practitioners[0]?.id || 'dr_01');

  // New Prescription Composer State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [compPatientId, setCompPatientId] = useState<string>(patients[0]?.id || '');
  const [compDoctorId, setCompDoctorId] = useState<string>(practitioners[0]?.id || 'dr_01');
  const [compItems, setCompItems] = useState<MedicalPrescriptionItem[]>([
    {
      drugName: 'Paracétamol 1g',
      form: 'Comprimé',
      dosage: '1 comprimé',
      frequency: '3 fois par jour',
      durationDays: 5,
      instructions: 'Prendre pendant les repas si douleur ou fièvre',
    },
  ]);
  const [compNotes, setCompNotes] = useState('');
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  // Common Drug Allergy Risk Mapping
  const checkDrugAllergy = (drugName: string, patientAllergies: string[]): string | null => {
    const lowerDrug = drugName.toLowerCase();
    for (const allergy of patientAllergies) {
      const lowerAllergy = allergy.toLowerCase();
      if (
        (lowerAllergy.includes('pénicilline') || lowerAllergy.includes('penicilline')) &&
        (lowerDrug.includes('amoxicilline') || lowerDrug.includes('augmentin') || lowerDrug.includes('clamoxyl') || lowerDrug.includes('ampicilline'))
      ) {
        return `Contre-indication majeure : Patient allergique à la ${allergy}. Risque de choc anaphylactique avec ${drugName}.`;
      }
      if (
        lowerAllergy.includes('aspirine') &&
        (lowerDrug.includes('aspirin') || lowerDrug.includes('aspégic') || lowerDrug.includes('kardegic') || lowerDrug.includes('acide acétylsalicylique'))
      ) {
        return `Contre-indication : Patient allergique à l'${allergy}. Prescription déconseillée.`;
      }
      if (
        (lowerAllergy.includes('ains') || lowerAllergy.includes('anti-inflammatoire')) &&
        (lowerDrug.includes('ibuprofène') || lowerDrug.includes('voltarène') || lowerDrug.includes('kétoprofène') || lowerDrug.includes('bi-profenid'))
      ) {
        return `Contre-indication : Allergie aux AINS déclarée.`;
      }
      if (lowerDrug.includes(lowerAllergy)) {
        return `Alerte allergie déclarée pour : ${allergy}.`;
      }
    }
    return null;
  };

  const selectedPatientForComp = useMemo(() => {
    return patients.find((p) => p.id === compPatientId);
  }, [patients, compPatientId]);

  const allergyAlerts = useMemo(() => {
    if (!selectedPatientForComp?.allergies) return [];
    const alerts: string[] = [];
    compItems.forEach((it) => {
      const warning = checkDrugAllergy(it.drugName, selectedPatientForComp.allergies || []);
      if (warning) alerts.push(warning);
    });
    return alerts;
  }, [selectedPatientForComp, compItems]);

  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      const matchesSearch =
        rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rx.qrCodeHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rx.items.some((item) => item.drugName.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
      if (filterStatus === 'multi') return rx.items.length >= 3;
      if (filterStatus === 'recent') {
        const diffDays = (new Date().getTime() - new Date(rx.prescriptionDate).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 14;
      }
      return true;
    });
  }, [prescriptions, searchQuery, filterStatus]);

  const sortedPrescriptions = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const isPinnedA = pinnedIds.has(a.id);
      const isPinnedB = pinnedIds.has(b.id);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;

      if (sortBy === 'patientName') {
        return sortDir === 'asc'
          ? a.patientName.localeCompare(b.patientName)
          : b.patientName.localeCompare(a.patientName);
      }
      return sortDir === 'asc'
        ? a.prescriptionDate.localeCompare(b.prescriptionDate)
        : b.prescriptionDate.localeCompare(a.prescriptionDate);
    });
    return list;
  }, [filtered, pinnedIds, sortBy, sortDir]);

  const totalDrugsPrescribed = prescriptions.reduce((acc, rx) => acc + rx.items.length, 0);

  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    showToast(isAr ? 'تم تحديث التثبيت' : 'Ordonnance épinglée', 'info');
  };

  const handlePrint = (rx: MedicalPrescription) => {
    showToast(
      isAr
        ? 'جاري تجهيز الوصفة الطبية للطباعة...'
        : 'Génération du document ordonnancier sécurisé...',
      'info'
    );
    window.print();
  };

  const handleSaveComposer = () => {
    if (!selectedPatientForComp) {
      showToast('Veuillez sélectionner un patient valide', 'error');
      return;
    }
    if (allergyAlerts.length > 0 && !overrideConfirmed) {
      showToast('Veuillez valider le déblocage médical de sécurité contre-indication', 'error');
      return;
    }
    if (compItems.length === 0) {
      showToast('Veuillez prescrire au moins une spécialité', 'error');
      return;
    }

    const doc = practitioners.find((p) => p.id === compDoctorId);
    const newRx: MedicalPrescription = {
      id: `rx_${Date.now()}`,
      patientId: selectedPatientForComp.id,
      patientName: selectedPatientForComp.fullName,
      prescriptionDate: new Date().toISOString().slice(0, 10),
      items: compItems,
      notes: compNotes || undefined,
      qrCodeHash: `ALG-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      prescribingDoctorId: compDoctorId,
      prescribingDoctorName: doc ? (doc.fullName || doc.name || 'Dr. Praticien') : 'Dr. Amina Benali',
    };

    addPrescription(newRx);
    setSelectedRx(newRx);
    setIsComposerOpen(false);
    showToast('Nouvelle ordonnance certifiée Chifa générée', 'success');
  };

  const currentDoctorConfig: DoctorOrdonnanceConfig = useMemo(() => {
    return (
      doctorConfigs[activeDoctorId] || {
        doctorId: activeDoctorId,
        doctorName: 'Dr. Amina Benali',
        specialtyTitle: 'Spécialiste en Cardiologie & Maladies Vasculaires',
        qualifications: 'Ancienne Interne des Hôpitaux d\'Alger - CES Cardiologie',
        clinicName: 'Polyclinique El-Chifa',
        addressLine: '14, Boulevard des Martyrs, Alger Centre',
        phoneContact: '021 74 88 90 / 0550 12 34 56',
        councilOrderNumber: '16/4820-DZ',
        paperSize: 'A5',
        accentColor: '#1e3a8a',
        usePreprintedStationery: false,
        digitalStampUrl: 'CACHET OFFICIEL AGRÉÉ MSPRH',
        showWatermark: true,
      }
    );
  }, [doctorConfigs, activeDoctorId]);

  const columns: ColumnDefinition<MedicalPrescription>[] = [
    {
      key: 'patientName',
      header: isAr ? 'المريض / الرمز' : 'Patient & Référence',
      sortable: true,
      minWidth: '220px',
      renderCell: (rx) => {
        const isPinned = pinnedIds.has(rx.id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0 border border-orange-100 dark:border-neutral-800">
              <Pill size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                {rx.patientName}
                {isPinned && <span className="text-xs text-amber-500">📌</span>}
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">
                {rx.qrCodeHash} · {rx.prescriptionDate}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'doctor',
      header: isAr ? 'الطبيب المعالج' : 'Praticien',
      minWidth: '170px',
      renderCell: (rx) => (
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {rx.prescribingDoctorName || 'Dr. Polyclinique'}
        </span>
      ),
    },
    {
      key: 'itemsCount',
      header: isAr ? 'الأدوية الموصوفة' : 'Médicaments',
      minWidth: '130px',
      renderCell: (rx) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 font-mono">
          {rx.items.length} {isAr ? 'مستحضرات' : 'spécialités'}
        </span>
      ),
    },
    {
      key: 'security',
      header: isAr ? 'الأمان والتحقق' : 'Signature & QR',
      minWidth: '150px',
      renderCell: (rx) => (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <QrCode size={13} className="shrink-0" />
          <span className="font-mono text-[11px]">Certifié Chifa</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Pill size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الوصفات الطبية الإلكترونية (Ordonnances)' : 'Ordonnances Médicales Sécurisées'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Chifa Validated
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إصدار الوصفات الرقمية، الجرعات، التوقيع الطبي الإلكتروني والتحقق بـ QR Code'
                : 'Prescriptions normalisées, posologie, signature numérique & QR Code'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SubTab switcher */}
          <div className="flex bg-neutral-200/80 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMainTab('prescriptions')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMainTab === 'prescriptions'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {isAr ? 'الوصفات الطبية' : 'Ordonnances'}
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('ngap')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMainTab === 'ngap'
                  ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {isAr ? 'دليل الفحوصات NGAP' : 'Nomenclature NGAP'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPersonalizerOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:border-[#C4785A] text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Settings size={14} className="text-[#C4785A]" />
            <span>{isAr ? 'تخصيص الأوردونونس' : 'Studio Ordonnance'}</span>
          </button>

          <AtriumButton
            type="button"
            variant="primary"
            size="md"
            icon={<Plus size={15} />}
            onClick={() => setIsComposerOpen(true)}
          >
            <span>{isAr ? 'وصفة جديدة' : 'Nouvelle Ordonnance'}</span>
          </AtriumButton>
        </div>
      </div>

      {activeMainTab === 'ngap' ? (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs animate-in fade-in duration-150">
          <div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
              <Stethoscope size={16} className="text-[#C4785A]" />
              <span>{isAr ? 'دليل الفحوصات والأعمال الطبية (NGAP)' : 'Nomenclature Générale des Actes Professionnels (NGAP)'}</span>
            </h3>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'التعريفات الرسمية للضمان الاجتماعي، حصص الصندوق والتغذية التلقائية للمستهلكات'
                : 'Codification officielle CNAS/CASNOS, tarifs conventionnés, ticket modérateur et dépréciation du stock'}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500">
                <tr>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Code NGAP</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Libellé de l'Acte Médical</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Catégorie</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Tarif Conv.</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Part CNAS (80%)</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Ticket Mod.</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px]">Consommables Déduits</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Action Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {NGAP_ACTS.map((act) => (
                  <tr key={act.code} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-700/20 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#C4785A]">
                      <span className="px-2 py-0.5 rounded-md bg-[#C4785A]/10 border border-[#C4785A]/20">
                        {act.code}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-neutral-900 dark:text-white">
                      {act.label}
                    </td>
                    <td className="p-3.5 text-neutral-500">
                      {act.category}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-neutral-900 dark:text-white">
                      {act.conventionFeeDzd.toLocaleString()} DA
                    </td>
                    <td className="p-3.5 font-mono text-emerald-600 font-semibold">
                      {act.cnasReimbursementDzd.toLocaleString()} DA
                    </td>
                    <td className="p-3.5 font-mono text-neutral-600 dark:text-neutral-300">
                      {act.ticketModerateurDzd.toLocaleString()} DA
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {act.linkedConsumables.map((c, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-mono">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          depleteForAct(act.code);
                          showToast(`Consommables déduits avec succès pour acte [${act.code}]`, 'success');
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-[#C4785A] hover:text-white transition-colors cursor-pointer"
                        title="Simuler la dépréciation des consommables pour cet acte"
                      >
                        Consommer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Pod Tray */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
            <div>
              <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                {isAr ? 'مؤشرات الوصفات الطبية والسلامة الدوائية' : 'Indicateurs de Prescription & Sécurisation Pharmacologique'}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isAr ? 'المطابقة الدوائية مع الصندوق الوطني للتأمينات، والتحقق الفوري بالباركود' : 'Conformité Chifa, détection des interactions et traçabilité par QR Code certifié'}
              </p>
            </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الوصفات الصادرة' : 'Ordonnances Signées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
                {prescriptions.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Archivage légal ordonnancier
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الأدوية الموصوفة' : 'Lignes Médicamenteuses'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {totalDrugsPrescribed}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Posologies & durées vérifiées
              </p>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'التأمين والصيدليات' : 'Sécurité & Chifa'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                QR PROTOCOL
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                100% Validé
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span>Délivrance directe en officine</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'أرشيف الوصفات الطبية' : 'Registre des Ordonnances Médicales'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {sortedPrescriptions.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث بمريض، دواء أو كود QR...' : 'Rechercher patient, médicament ou QR code...'}
              shutSize={36}
              openWidth={220}
            />

            {/* Prescription Domain Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(
                [
                  { id: 'all', label: isAr ? 'الكل' : 'Toutes' },
                  { id: 'recent', label: isAr ? 'حديثة (<14j)' : 'Récentes (<14j)' },
                  { id: 'multi', label: isAr ? 'متعددة الأدوية' : 'Polymédicamentées (≥3)' },
                ] as const
              ).map((filter) => {
                const isActive = filterStatus === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setFilterStatus(filter.id)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Workspace Area with Dual Collection and 430px Inspector */}
        <div className="flex items-start gap-4">
          {/* Collection */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<MedicalPrescription>
              items={sortedPrescriptions}
              keyExtractor={(rx) => rx.id}
              defaultViewMode={viewMode}
              columns={columns}
              sortBy={sortBy}
              sortDirection={sortDir}
              onSortChange={(key) => {
                if (sortBy === key) {
                  setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setSortBy(key);
                  setSortDir('asc');
                }
              }}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              isPinned={(rx) => pinnedIds.has(rx.id)}
              onTogglePin={(rx) => handleTogglePin(rx.id)}
              onItemClick={(rx) => setSelectedRx(rx)}
              customActions={(rx) => [
                {
                  id: 'print',
                  label: isAr ? 'طباعة' : 'Imprimer',
                  icon: <Printer size={13} />,
                  variant: 'primary',
                  onClick: () => handlePrint(rx),
                },
                {
                  id: 'fiche',
                  label: isAr ? 'معاينة' : 'Aperçu',
                  icon: <FileText size={13} />,
                  onClick: () => setSelectedRx(rx),
                },
              ]}
              renderCard={(rx) => {
                const isPinned = pinnedIds.has(rx.id);
                return (
                  <div className="flex flex-col w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {rx.patientName} {isPinned && '📌'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                        {rx.qrCodeHash}
                      </span>
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3 space-y-1.5 text-xs">
                      {rx.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-neutral-700 dark:text-neutral-300">
                          <span className="font-semibold truncate max-w-[170px]">{item.drugName}</span>
                          <span className="text-neutral-400 font-mono text-[11px]">{item.dosage}</span>
                        </div>
                      ))}
                      {rx.items.length > 2 && (
                        <div className="text-[10px] text-neutral-400">
                          +{rx.items.length - 2} autre(s) spécialité(s)...
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                      <span>{rx.prescriptionDate}</span>
                      <span className="text-[#C4785A] font-medium">{rx.items.length} lignes</span>
                    </div>
                  </div>
                );
              }}
              emptyTitle={isAr ? 'لا توجد وصفات' : 'Aucune ordonnance émise'}
              emptyDescription={isAr ? 'قم بإنشاء فحص لتحرير وصفة' : 'Prescrivez une ordonnance depuis un dossier patient'}
            />
          </div>

          {/* 430px Inline Side Inspector Drawer */}
          {selectedRx && (
            <div className="w-full lg:w-[430px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Header */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#C4785A] font-bold text-sm flex items-center justify-center shrink-0 border border-orange-200/60">
                    <Pill size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                      {selectedRx.patientName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <span className="font-mono">Réf: {selectedRx.qrCodeHash}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRx(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-4 bg-white dark:bg-neutral-850 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('posologie')}
                  className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'posologie'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {isAr ? 'الجرعات والأدوية' : 'Posologie'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('apercu')}
                  className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'apercu'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {isAr ? 'المعاينة والورق' : 'Papier / Studio'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('securite')}
                  className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'securite'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {isAr ? 'الأمان والـ QR' : 'Sécurité & QR'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('actions')}
                  className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'actions'
                      ? 'border-[#C4785A] text-[#C4785A]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {isAr ? 'الإجراءات' : 'Actions'}
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {activeTab === 'posologie' && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="text-[11px] font-semibold text-neutral-400">
                      LISTE DES SPÉCIALITÉS DÉLIVRÉES ({selectedRx.items.length})
                    </div>

                    {selectedRx.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-neutral-900 dark:text-white text-xs">
                            {idx + 1}. {item.drugName}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px]">
                            {item.durationDays}j
                          </span>
                        </div>
                        <div className="text-[11px] text-[#C4785A] font-medium">
                          {item.dosage} · {item.frequency}
                        </div>
                        {item.instructions && (
                          <div className="text-[11px] text-neutral-500 italic">
                            "{item.instructions}"
                          </div>
                        )}
                      </div>
                    ))}

                    {selectedRx.notes && (
                      <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                        <span className="font-bold text-[10px] block mb-0.5">RECOMMANDATION MÉDICALE:</span>
                        {selectedRx.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Printable Format / Studio Preview */}
                {activeTab === 'apercu' && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold block text-neutral-900 dark:text-white">Format Document</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {currentDoctorConfig.paperSize} · {currentDoctorConfig.usePreprintedStationery ? 'Papier Pré-imprimé' : 'Papier Vierge'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPersonalizerOpen(true)}
                        className="px-2.5 py-1 text-xs rounded bg-[#C4785A] text-white font-semibold shadow-2xs"
                      >
                        Configurer
                      </button>
                    </div>

                    {/* Paper Document Preview Simulation */}
                    <div
                      className={`p-4 rounded-xl border bg-white text-neutral-900 shadow-sm relative overflow-hidden text-[11px] font-sans ${
                        currentDoctorConfig.usePreprintedStationery ? 'border-dashed border-amber-300' : 'border-neutral-200'
                      }`}
                      style={{ minHeight: '360px' }}
                    >
                      {currentDoctorConfig.usePreprintedStationery ? (
                        <div className="border border-dashed border-amber-400 bg-amber-50/60 rounded p-2 text-center text-amber-800 text-[10px] mb-4">
                          <strong>Mode Papier En-tête Pré-imprimé Actif :</strong> L'en-tête et le pied de page sont masqués pour impression directe sur votre papeterie physique d'imprimerie.
                        </div>
                      ) : (
                        <div
                          className="border-b-2 pb-2 mb-3"
                          style={{ borderColor: currentDoctorConfig.accentColor }}
                        >
                          <div className="font-bold text-sm" style={{ color: currentDoctorConfig.accentColor }}>
                            {currentDoctorConfig.doctorName}
                          </div>
                          <div className="text-[10px] text-neutral-600 font-medium">
                            {currentDoctorConfig.specialtyTitle}
                          </div>
                          <div className="text-[9px] text-neutral-400">
                            {currentDoctorConfig.qualifications} · N° Ordre: {currentDoctorConfig.councilOrderNumber}
                          </div>
                        </div>
                      )}

                      {/* Patient & Date Meta */}
                      <div className="flex justify-between items-baseline mb-4 text-[10px] bg-neutral-50 p-2 rounded border border-neutral-100">
                        <div>
                          Patient(e): <strong className="text-xs uppercase">{selectedRx.patientName}</strong>
                        </div>
                        <div className="font-mono text-neutral-500">
                          Le : {selectedRx.prescriptionDate}
                        </div>
                      </div>

                      {/* Prescription Items */}
                      <div className="space-y-2 mb-6">
                        <div className="font-serif italic font-bold text-xs underline mb-1">Ordonnance :</div>
                        {selectedRx.items.map((it, idx) => (
                          <div key={idx} className="pl-2 border-l-2 border-neutral-200 text-[11px]">
                            <div className="font-bold text-neutral-800">
                              - {it.drugName} ({it.dosage})
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono">
                              {it.frequency} pendant {it.durationDays} jours
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Digital Stamp & QR Verification */}
                      <div className="flex justify-between items-end pt-4 border-t border-neutral-100 mt-6">
                        <div className="flex items-center gap-2">
                          <QrCode size={36} className="text-neutral-700" />
                          <div className="text-[8px] font-mono text-neutral-400 leading-tight">
                            ORD-CHIFA
                            <br />
                            {selectedRx.qrCodeHash}
                          </div>
                        </div>

                        {/* Stamp */}
                        <div className="border border-rose-600 rounded-lg p-1.5 text-center text-rose-700 rotate-[-4deg] opacity-85 text-[8px] font-mono leading-tight">
                          <div className="font-bold text-[9px]">{currentDoctorConfig.digitalStampUrl}</div>
                          <div>{currentDoctorConfig.doctorName}</div>
                          <div>{currentDoctorConfig.councilOrderNumber}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'securite' && (
                  <div className="space-y-4 animate-in fade-in duration-150 text-center">
                    <div className="p-6 rounded-2xl bg-white dark:bg-neutral-800 border-2 border-dashed border-[#C4785A]/40 flex flex-col items-center justify-center space-y-3">
                      <QrCode size={80} className="text-[#C4785A]" />
                      <div>
                        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                          {selectedRx.qrCodeHash}
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          Signature numérique certifiée par l'Ordre des Médecins
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-left space-y-1">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <CheckCircle2 size={14} />
                        <span>Conformité Chifa / CNAS Validée</span>
                      </div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        Ce code QR permet la lecture automatisée dans toutes les pharmacies conventionnées en Algérie.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="space-y-2.5 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={() => handlePrint(selectedRx)}
                      className="w-full p-3 rounded-xl bg-[#C4785A] text-white font-semibold flex items-center justify-between hover:bg-[#b0674b] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Printer size={16} />
                        Imprimer ordonnance PDF
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePin(selectedRx.id)}
                      className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Pin size={16} />
                        {pinnedIds.has(selectedRx.id) ? 'Détacher' : 'Épingler au dossier'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => showToast('Ordonnance dupliquée avec succès', 'success')}
                      className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={16} />
                        Renouveler / Dupliquer traitement
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Doctor Ordonnance Personalizer Modal */}
      {isPersonalizerOpen && (
        <MedicalOrdonnancePersonalizerModal
          isOpen={isPersonalizerOpen}
          practitioners={practitioners}
          doctorConfigs={doctorConfigs}
          initialDoctorId={activeDoctorId}
          onSaveConfig={(docId, updated) => {
            updateDoctorConfig(docId, updated);
            setIsPersonalizerOpen(false);
            showToast('Paramètres de l\'ordonnance enregistrés', 'success');
          }}
          onClose={() => setIsPersonalizerOpen(false)}
        />
      )}

      {/* New Prescription Composer Modal with Allergy Cross-Checking */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-850">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center">
                  <Pill size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Nouvelle Prescription Médicale Sécurisée
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Contrôle automatique des contre-indications et posologies Chifa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Doctor & Patient Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                    Médecin Prescripteur
                  </label>
                  <select
                    value={compDoctorId}
                    onChange={(e) => setCompDoctorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    {practitioners.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.fullName || doc.name} ({doc.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                    Patient Destinataire
                  </label>
                  <select
                    value={compPatientId}
                    onChange={(e) => {
                      setCompPatientId(e.target.value);
                      setOverrideConfirmed(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} (NSS: {p.nationalId || 'Chifa OK'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Allergies & Chronic summary */}
              {selectedPatientForComp && (
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold">Vigilances du dossier</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">
                        {selectedPatientForComp.bloodGroup || 'O+'} · {selectedPatientForComp.phone}
                      </span>
                    </div>
                  </div>
                  <div>
                    {selectedPatientForComp.allergies && selectedPatientForComp.allergies.length > 0 ? (
                      <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        ⚠️ Allergies : {selectedPatientForComp.allergies.join(', ')}
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-[11px]">Aucune allergie connue</span>
                    )}
                  </div>
                </div>
              )}

              {/* Real-time Allergy Conflict Banner */}
              {allergyAlerts.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/80 text-rose-800 dark:text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <ShieldAlert size={16} className="text-rose-600 animate-pulse" />
                    <span>ALERTE DE SÉCURITÉ PHARMACOLOGIQUE (CONTRE-INDICATION SÉVÈRE)</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px]">
                    {allergyAlerts.map((alt, i) => (
                      <li key={i} className="font-medium">
                        {alt}
                      </li>
                    ))}
                  </ul>

                  <label className="flex items-center gap-2 pt-1 font-semibold text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideConfirmed}
                      onChange={(e) => setOverrideConfirmed(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      Je confirme en tant que médecin responsable avoir évalué le bénéfice/risque et autorise la délivrance.
                    </span>
                  </label>
                </div>
              )}

              {/* Medication Lines */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase">
                    Lignes de Prescription ({compItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCompItems((prev) => [
                        ...prev,
                        {
                          drugName: '',
                          form: 'Comprimé',
                          dosage: '1 cp',
                          frequency: '2 fois par jour',
                          durationDays: 7,
                          instructions: 'Après repas',
                        },
                      ])
                    }
                    className="px-2 py-1 rounded bg-[#C4785A] text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <Plus size={11} />
                    <span>Ajouter Médicament</span>
                  </button>
                </div>

                {compItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-400 text-xs w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder="Nom de spécialité / DCI (ex: Augmentin 1g, Inexium 20mg)..."
                        value={item.drugName}
                        onChange={(e) => {
                          const updated = [...compItems];
                          updated[idx].drugName = e.target.value;
                          setCompItems(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-xs font-semibold"
                      />
                      {compItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCompItems(compItems.filter((_, i) => i !== idx))}
                          className="p-1 text-neutral-400 hover:text-rose-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-400">Dosage</label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => {
                            const updated = [...compItems];
                            updated[idx].dosage = e.target.value;
                            setCompItems(updated);
                          }}
                          className="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400">Fréquence / Prise</label>
                        <input
                          type="text"
                          value={item.frequency}
                          onChange={(e) => {
                            const updated = [...compItems];
                            updated[idx].frequency = e.target.value;
                            setCompItems(updated);
                          }}
                          className="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400">Durée (Jours)</label>
                        <input
                          type="number"
                          value={item.durationDays}
                          onChange={(e) => {
                            const updated = [...compItems];
                            updated[idx].durationDays = parseInt(e.target.value) || 1;
                            setCompItems(updated);
                          }}
                          className="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consignes / Notes */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">
                  Recommandations au Patient
                </label>
                <textarea
                  value={compNotes}
                  onChange={(e) => setCompNotes(e.target.value)}
                  rows={2}
                  placeholder="Conseils hygiéno-diététiques, hydratation, repos..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-850">
              <span className="text-[11px] text-neutral-400 font-mono">
                Code QR sécurisé généré automatiquement
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="md"
                  icon={<ShieldCheck size={14} />}
                  onClick={handleSaveComposer}
                >
                  <span>Signer & Valider l'Ordonnance</span>
                </AtriumButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
