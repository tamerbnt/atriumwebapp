import React, { useState, useEffect, useMemo } from 'react';
import {
  HardHat,
  Hammer,
  ClipboardList,
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText,
  Truck,
  Users,
  Sun,
  CloudRain,
  Wind,
  Check,
  X,
  Eye,
  Filter,
  BarChart3,
  Percent,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import {
  ContractorProject,
  ContractorBoqItem,
  ContractorDailyLog,
  ContractorDgp,
} from '../../../types/index';

interface ContractorViewProps {
  initialTab?: 'dashboard' | 'projects' | 'boq' | 'progress' | 'finance';
}

export const ContractorView: React.FC<ContractorViewProps> = ({ initialTab }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isRtl = language === 'ar';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'boq' | 'progress' | 'finance'>(
    initialTab || 'dashboard'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Projects State
  const [projects, setProjects] = useState<ContractorProject[]>([
    {
      id: 'proj_btp_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectCode: 'CHANT-2026-08',
      projectName: 'Construction Siège Tertiaire & Bureaux R+5',
      clientName: 'SPA Maghreb Logistique & Services',
      siteLocation: 'Zone d\'Activité Chéraga, Alger',
      contractAmountDzd: 85000000,
      retentionGuaranteePercent: 5,
      retentionAmountDzd: 4250000,
      startDate: '2026-01-15',
      targetEndDate: '2026-12-20',
      supervisorName: 'Ing. Mourad Benali',
      progressPercent: 48,
      status: 'InProgress',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'proj_btp_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectCode: 'CHANT-2026-14',
      projectName: 'Aménagement Voirie & Réseaux Divers (VRD) Lotissement',
      clientName: 'EURL Promotion Immobilière El Bahia',
      siteLocation: 'Bir El Djir, Oran',
      contractAmountDzd: 34500000,
      retentionGuaranteePercent: 5,
      retentionAmountDzd: 1725000,
      startDate: '2026-03-01',
      targetEndDate: '2026-09-30',
      supervisorName: 'Conducteur Travaux Sofiane K.',
      progressPercent: 72,
      status: 'InProgress',
      createdAt: '2026-03-01T08:00:00Z',
    },
    {
      id: 'proj_btp_03',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectCode: 'CHANT-2025-22',
      projectName: 'Réhabilitation Hangar Frigorifique & Dallage Industriel',
      clientName: 'Coopérative Agro-Alimentaire Mitidja',
      siteLocation: 'Boufarik, Blida',
      contractAmountDzd: 18200000,
      retentionGuaranteePercent: 5,
      retentionAmountDzd: 910000,
      startDate: '2025-10-10',
      targetEndDate: '2026-04-15',
      supervisorName: 'Ing. Karim Hamdi',
      progressPercent: 100,
      status: 'ProvisionalHandover',
      createdAt: '2025-10-10T08:00:00Z',
    },
  ]);

  // Selected Project for details/filtering
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj_btp_01');
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // BOQ / BPU Items
  const [boqItems, setBoqItems] = useState<ContractorBoqItem[]>([
    {
      id: 'boq_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      itemCode: '01.01',
      designation: 'Terrassement général en grande masse et décapage rocheux',
      unit: 'm3',
      plannedQty: 3200,
      executedQty: 3200,
      unitPriceDzd: 1800,
      totalPlannedDzd: 5760000,
      totalExecutedDzd: 5760000,
      createdAt: '2026-01-16T08:00:00Z',
    },
    {
      id: 'boq_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      itemCode: '02.01',
      designation: 'Béton armé dosé à 350 kg/m3 pour semelles filantes et radier',
      unit: 'm3',
      plannedQty: 540,
      executedQty: 540,
      unitPriceDzd: 22000,
      totalPlannedDzd: 11880000,
      totalExecutedDzd: 11880000,
      createdAt: '2026-01-16T08:00:00Z',
    },
    {
      id: 'boq_03',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      itemCode: '02.04',
      designation: 'Béton armé en élévation pour poteaux, poutres et voiles RDC à R+5',
      unit: 'm3',
      plannedQty: 780,
      executedQty: 420,
      unitPriceDzd: 26500,
      totalPlannedDzd: 20670000,
      totalExecutedDzd: 11130000,
      createdAt: '2026-01-16T08:00:00Z',
    },
    {
      id: 'boq_04',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      itemCode: '03.02',
      designation: 'Planchers corps creux type 16+4 avec hourdis et treillis soudé',
      unit: 'm2',
      plannedQty: 2400,
      executedQty: 1200,
      unitPriceDzd: 3800,
      totalPlannedDzd: 9120000,
      totalExecutedDzd: 4560000,
      createdAt: '2026-01-16T08:00:00Z',
    },
    {
      id: 'boq_05',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      itemCode: '04.01',
      designation: 'Maçonnerie double cloison briques creuses 10+5 avec isolation',
      unit: 'm2',
      plannedQty: 1850,
      executedQty: 380,
      unitPriceDzd: 2900,
      totalPlannedDzd: 5365000,
      totalExecutedDzd: 1102000,
      createdAt: '2026-01-16T08:00:00Z',
    },
    {
      id: 'boq_06',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      itemCode: '07.01',
      designation: 'Complexe d\'étanchéité multicouche gravillonnée pour toiture terrasse',
      unit: 'm2',
      plannedQty: 480,
      executedQty: 0,
      unitPriceDzd: 4200,
      totalPlannedDzd: 2016000,
      totalExecutedDzd: 0,
      createdAt: '2026-01-16T08:00:00Z',
    },
  ]);

  // Daily Site Logs
  const [dailyLogs, setDailyLogs] = useState<ContractorDailyLog[]>([
    {
      id: 'log_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      date: '2026-05-18',
      weather: 'Ensoleillé',
      headcountWorkers: 24,
      equipmentOnSite: ['Grue à tour Potain 45m', '2x Camions Toupie 8m3', '1x Pompe à béton automotrice', 'Vibreurs thermiques'],
      tasksAccomplished: 'Coulage plancher dalle pleine niveau R+3 (180 m2). Coffrage et ferraillage des voiles cage ascenseur.',
      incidentsSafety: 'R.A.S. Port des EPI 100% vérifié. Essai affaissement au cône d\'Abrams conforme (14 cm).',
      supervisorSignature: 'Ing. Mourad Benali',
      createdAt: '2026-05-18T17:30:00Z',
    },
    {
      id: 'log_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      date: '2026-05-17',
      weather: 'Venteux / Sirocco',
      headcountWorkers: 18,
      equipmentOnSite: ['Grue à tour Potain (mise en girouette temporaire)', 'Échafaudages tubulaires'],
      tasksAccomplished: 'Pose du treillis soudé et des gaines électriques encastrées sous plancher R+3. Réception contradictoire ferraillage par BET.',
      incidentsSafety: 'Arrêt de travail en hauteur pendant 2h en milieu d\'après-midi pour rafales de vent > 55 km/h.',
      supervisorSignature: 'Ing. Mourad Benali',
      createdAt: '2026-05-17T17:00:00Z',
    },
  ]);

  // DGP (Décompte Général Provisoire) Situations
  const [dgps, setDgps] = useState<ContractorDgp[]>([
    {
      id: 'dgp_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      dgpNumber: 'DGP-01-CHANT-08',
      periodLabel: 'Situation N°01 - Travaux Février 2026',
      grossCompletedDzd: 17640000,
      previousCumulDzd: 0,
      periodGrossDzd: 17640000,
      retentionGuaranteePercent: 5,
      retentionGuaranteeDzd: 882000,
      advanceAmortizationDzd: 1764000,
      tvaPercent: 19,
      tvaAmountDzd: 2848860,
      netPayableDzd: 17842860,
      status: 'Paid',
      issuedDate: '2026-03-02',
      createdAt: '2026-03-02T10:00:00Z',
    },
    {
      id: 'dgp_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: 'proj_btp_01',
      dgpNumber: 'DGP-02-CHANT-08',
      periodLabel: 'Situation N°02 - Travaux Avril 2026',
      grossCompletedDzd: 34432000,
      previousCumulDzd: 17640000,
      periodGrossDzd: 16792000,
      retentionGuaranteePercent: 5,
      retentionGuaranteeDzd: 839600,
      advanceAmortizationDzd: 1679200,
      tvaPercent: 19,
      tvaAmountDzd: 2711864,
      netPayableDzd: 16985064,
      status: 'ApprovedBE',
      issuedDate: '2026-05-02',
      createdAt: '2026-05-02T11:00:00Z',
    },
  ]);

  // Modal States
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isDailyLogModalOpen, setIsDailyLogModalOpen] = useState(false);
  const [isDgpModalOpen, setIsDgpModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [dgpToPrint, setDgpToPrint] = useState<ContractorDgp | null>(null);

  // Form States
  const [newProjectForm, setNewProjectForm] = useState({
    projectCode: 'CHANT-2026-19',
    projectName: '',
    clientName: '',
    siteLocation: '',
    contractAmountDzd: 45000000,
    retentionGuaranteePercent: 5,
    advancePaymentFraction: 10,
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: '2026-12-31',
    supervisorName: 'Ing. Mustapha S.',
  });

  const [newBoqForm, setNewBoqForm] = useState({
    itemCode: '05.02',
    designation: '',
    unit: 'm2' as ContractorBoqItem['unit'],
    plannedQty: 100,
    unitPriceDzd: 3500,
  });

  const [surveyQuantities, setSurveyQuantities] = useState<Record<string, number>>({});

  const [newLogForm, setNewLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weather: 'Ensoleillé' as ContractorDailyLog['weather'],
    headcountWorkers: 20,
    equipment: 'Grue à tour, Bétonnière, Compresseur d\'air',
    tasksAccomplished: '',
    incidentsSafety: 'R.A.S. Tous les équipements de sécurité conformes.',
    supervisorSignature: 'Conducteur de Travaux',
  });

  const [newDgpForm, setNewDgpForm] = useState({
    periodLabel: 'Situation N°03 - Travaux Mai 2026',
    tvaPercent: 19,
    advanceAmortizationPercent: 10,
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Stats
  const totalPortfolioValue = useMemo(() => {
    return projects.reduce((acc, p) => acc + p.contractAmountDzd, 0);
  }, [projects]);

  const totalRetentionBlocked = useMemo(() => {
    return projects.reduce((acc, p) => acc + p.retentionAmountDzd, 0);
  }, [projects]);

  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => p.status === 'InProgress').length;
  }, [projects]);

  const selectedBoqItems = useMemo(() => {
    return boqItems.filter((item) => item.projectId === selectedProjectId);
  }, [boqItems, selectedProjectId]);

  const boqExecutedTotal = useMemo(() => {
    return selectedBoqItems.reduce((acc, item) => acc + item.totalExecutedDzd, 0);
  }, [selectedBoqItems]);

  const boqPlannedTotal = useMemo(() => {
    return selectedBoqItems.reduce((acc, item) => acc + item.totalPlannedDzd, 0);
  }, [selectedBoqItems]);

  const selectedDgps = useMemo(() => {
    return dgps.filter((d) => d.projectId === selectedProjectId);
  }, [dgps, selectedProjectId]);

  // Actions
  const handleCreateProject = () => {
    if (!newProjectForm.projectName || !newProjectForm.clientName) {
      showToast('Veuillez renseigner le nom du projet et le maître d\'ouvrage', 'error');
      return;
    }

    const retentionAmount = (newProjectForm.contractAmountDzd * newProjectForm.retentionGuaranteePercent) / 100;

    const newProj: ContractorProject = {
      id: `proj_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectCode: newProjectForm.projectCode,
      projectName: newProjectForm.projectName,
      clientName: newProjectForm.clientName,
      siteLocation: newProjectForm.siteLocation || 'Alger, Algérie',
      contractAmountDzd: Number(newProjectForm.contractAmountDzd),
      retentionGuaranteePercent: Number(newProjectForm.retentionGuaranteePercent),
      retentionAmountDzd: retentionAmount,
      startDate: newProjectForm.startDate,
      targetEndDate: newProjectForm.targetEndDate,
      supervisorName: newProjectForm.supervisorName,
      progressPercent: 0,
      status: 'SitePreparation',
      createdAt: new Date().toISOString(),
    };

    setProjects([newProj, ...projects]);
    setSelectedProjectId(newProj.id);
    setIsNewProjectModalOpen(false);
    showToast(`Chantier ${newProj.projectCode} enregistré avec succès`, 'success');
  };

  const handleCreateBoqItem = () => {
    if (!newBoqForm.designation) {
      showToast('Veuillez renseigner la désignation du poste BOQ', 'error');
      return;
    }

    const totalPlanned = Number(newBoqForm.plannedQty) * Number(newBoqForm.unitPriceDzd);

    const newItem: ContractorBoqItem = {
      id: `boq_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProjectId,
      itemCode: newBoqForm.itemCode,
      designation: newBoqForm.designation,
      unit: newBoqForm.unit,
      plannedQty: Number(newBoqForm.plannedQty),
      executedQty: 0,
      unitPriceDzd: Number(newBoqForm.unitPriceDzd),
      totalPlannedDzd: totalPlanned,
      totalExecutedDzd: 0,
      createdAt: new Date().toISOString(),
    };

    setBoqItems([...boqItems, newItem]);
    setIsBoqModalOpen(false);
    setNewBoqForm({
      itemCode: '',
      designation: '',
      unit: 'm2',
      plannedQty: 100,
      unitPriceDzd: 3000,
    });
    showToast(`Poste ${newItem.itemCode} ajouté au bordereau`, 'success');
  };

  const handleOpenSurveyModal = () => {
    const initial: Record<string, number> = {};
    selectedBoqItems.forEach((item) => {
      initial[item.id] = item.executedQty;
    });
    setSurveyQuantities(initial);
    setIsSurveyModalOpen(true);
  };

  const handleSaveSurvey = () => {
    const updatedBoq = boqItems.map((item) => {
      if (item.projectId === selectedProjectId && surveyQuantities[item.id] !== undefined) {
        const executed = Number(surveyQuantities[item.id]);
        return {
          ...item,
          executedQty: executed,
          totalExecutedDzd: executed * item.unitPriceDzd,
        };
      }
      return item;
    });

    setBoqItems(updatedBoq);

    // Recalculate project global progress
    const thisProjItems = updatedBoq.filter((i) => i.projectId === selectedProjectId);
    const totalPlan = thisProjItems.reduce((acc, i) => acc + i.totalPlannedDzd, 0);
    const totalExec = thisProjItems.reduce((acc, i) => acc + i.totalExecutedDzd, 0);
    const newProgress = totalPlan > 0 ? Math.min(100, Math.round((totalExec / totalPlan) * 100)) : 0;

    setProjects(
      projects.map((p) => (p.id === selectedProjectId ? { ...p, progressPercent: newProgress } : p))
    );

    setIsSurveyModalOpen(false);
    showToast(`Attachement de métrés validé. Avancement chantier mis à jour: ${newProgress}%`, 'success');
  };

  const handleCreateDailyLog = () => {
    if (!newLogForm.tasksAccomplished) {
      showToast('Veuillez décrire les tâches accomplies', 'error');
      return;
    }

    const log: ContractorDailyLog = {
      id: `log_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProjectId,
      date: newLogForm.date,
      weather: newLogForm.weather,
      headcountWorkers: Number(newLogForm.headcountWorkers),
      equipmentOnSite: newLogForm.equipment.split(',').map((s) => s.trim()),
      tasksAccomplished: newLogForm.tasksAccomplished,
      incidentsSafety: newLogForm.incidentsSafety,
      supervisorSignature: newLogForm.supervisorSignature,
      createdAt: new Date().toISOString(),
    };

    setDailyLogs([log, ...dailyLogs]);
    setIsDailyLogModalOpen(false);
    setNewLogForm({
      date: new Date().toISOString().split('T')[0],
      weather: 'Ensoleillé',
      headcountWorkers: 20,
      equipment: 'Grue à tour, Bétonnière, Compresseur d\'air',
      tasksAccomplished: '',
      incidentsSafety: 'R.A.S. Tous les équipements de sécurité conformes.',
      supervisorSignature: 'Conducteur de Travaux',
    });
    showToast('Page du journal de chantier enregistrée', 'success');
  };

  const handleGenerateDgp = () => {
    const currentGrossCompleted = boqExecutedTotal;
    const lastDgp = selectedDgps[selectedDgps.length - 1];
    const previousCumul = lastDgp ? lastDgp.grossCompletedDzd : 0;
    const periodGross = Math.max(0, currentGrossCompleted - previousCumul);

    if (periodGross <= 0 && selectedDgps.length > 0) {
      showToast('Aucun nouveau montant exécuté depuis le dernier décompte', 'warning');
    }

    const retentionGuaranteePercent = selectedProject?.retentionGuaranteePercent || 5;
    const retentionDzd = (periodGross * retentionGuaranteePercent) / 100;
    const advanceAmortizationDzd = (periodGross * newDgpForm.advanceAmortizationPercent) / 100;

    const baseTaxable = periodGross - retentionDzd - advanceAmortizationDzd;
    const tvaAmount = (baseTaxable * newDgpForm.tvaPercent) / 100;
    const netPayable = baseTaxable + tvaAmount;

    const dgpSeq = selectedDgps.length + 1;
    const dgpNum = `DGP-0${dgpSeq}-${selectedProject?.projectCode || 'CHANT'}`;

    const newDgp: ContractorDgp = {
      id: `dgp_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProjectId,
      dgpNumber: dgpNum,
      periodLabel: newDgpForm.periodLabel,
      grossCompletedDzd: currentGrossCompleted,
      previousCumulDzd: previousCumul,
      periodGrossDzd: periodGross,
      retentionGuaranteePercent: retentionGuaranteePercent,
      retentionGuaranteeDzd: retentionDzd,
      advanceAmortizationDzd: advanceAmortizationDzd,
      tvaPercent: newDgpForm.tvaPercent,
      tvaAmountDzd: tvaAmount,
      netPayableDzd: netPayable,
      status: 'SubmittedClient',
      issuedDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    setDgps([...dgps, newDgp]);
    setIsDgpModalOpen(false);
    showToast(`Situation provisoire ${dgpNum} générée avec succès`, 'success');
  };

  const handlePrintDgp = (dgp: ContractorDgp) => {
    setDgpToPrint(dgp);
    setIsPrintModalOpen(true);
  };

  const handleAdvanceDgpStatus = (dgpId: string) => {
    setDgps(
      dgps.map((d) => {
        if (d.id === dgpId) {
          if (d.status === 'Draft') return { ...d, status: 'SubmittedClient' };
          if (d.status === 'SubmittedClient') return { ...d, status: 'ApprovedBE' };
          if (d.status === 'ApprovedBE') return { ...d, status: 'Paid' };
        }
        return d;
      })
    );
    showToast('Statut de la situation mis à jour', 'success');
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans"
    >
      {/* Top Banner */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-sm border border-amber-200 dark:border-amber-800">
            <HardHat size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'مقاولات البناء، الهندسة المدنية والأشغال العمومية BTP' : 'BTP, Travaux Publics & Génie Civil'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                FacilityType: 24
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Devis quantitatifs & estimatifs (BPU/BOQ), attachements mensuels, décomptes provisoires (DGP) et retenues de garantie
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDailyLogModalOpen(true)}
            className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-700 dark:text-neutral-200 font-medium text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Calendar size={14} className="text-amber-600" />
            <span>Journal de Chantier</span>
          </button>
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            <span>Nouveau Chantier (Projet)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Building size={15} />
          <span>Tableau Chantiers</span>
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'projects'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Hammer size={15} />
          <span>Projets & Chantiers ({projects.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('boq')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'boq'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <ClipboardList size={15} />
          <span>Bordereau Prix Unitaires (BPU/BOQ)</span>
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'progress'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <FileCheck size={15} />
          <span>Attachements & Journal de Chantier</span>
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'finance'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <DollarSign size={15} />
          <span>Facturation Travaux (DGP) & Retenue 5%</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Portefeuille Marchés BTP</span>
              <Building size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 text-amber-600">
              {formatMoney(totalPortfolioValue, 'DZD')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Cumul des marchés en cours et passés
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Retenues de Garantie Bloquées (5%)</span>
              <ShieldCheck size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
              {formatMoney(totalRetentionBlocked, 'DZD')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Libération à la réception définitive (12 mois)
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Chantiers en Exécution Active</span>
              <Hammer size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 text-neutral-900 dark:text-white">
              {activeProjectsCount}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Supervisés par conducteurs & ingénieurs
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Situations Provisoires Émises (DGP)</span>
              <FileText size={16} className="text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 text-purple-600">
              {dgps.length}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Approuvées par le BET / Payées par le Maître d'Ouvrage
            </div>
          </div>
        </div>

        {/* Project Selector Bar */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">Chantier Sélectionné :</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  [{proj.projectCode}] {proj.projectName} — {proj.clientName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-neutral-500">Avancement Global:</span>
            <div className="w-32 bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${selectedProject?.progressPercent || 0}%` }}
              />
            </div>
            <span className="font-mono font-bold text-amber-600">
              {selectedProject?.progressPercent || 0}%
            </span>
          </div>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Selected Project Card */}
              <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {selectedProject?.projectCode}
                    </span>
                    <h2 className="text-base font-bold text-neutral-900 dark:text-white mt-2">
                      {selectedProject?.projectName}
                    </h2>
                    <p className="text-xs text-neutral-500">{selectedProject?.siteLocation}</p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      selectedProject?.status === 'InProgress'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedProject?.status === 'ProvisionalHandover'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {selectedProject?.status === 'InProgress'
                      ? 'En Cours d\'Exécution'
                      : selectedProject?.status === 'ProvisionalHandover'
                      ? 'Réception Provisoire'
                      : selectedProject?.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div>
                    <div className="text-[11px] text-neutral-400">Maître d'Ouvrage (Client)</div>
                    <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                      {selectedProject?.clientName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-400">Montant Marché TTC</div>
                    <div className="text-xs font-mono font-bold text-amber-600 mt-0.5">
                      {formatMoney(selectedProject?.contractAmountDzd || 0, 'DZD')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-400">Retenue de Garantie (5%)</div>
                    <div className="text-xs font-mono font-bold text-emerald-600 mt-0.5">
                      {formatMoney(selectedProject?.retentionAmountDzd || 0, 'DZD')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-400">Superviseur / Conducteur</div>
                    <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                      {selectedProject?.supervisorName}
                    </div>
                  </div>
                </div>

                {/* BOQ Progress vs Budget */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Consommation Budgétaire du Bordereau (BOQ/BPU)
                    </span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(boqExecutedTotal, 'DZD')} / {formatMoney(boqPlannedTotal, 'DZD')}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${boqPlannedTotal > 0 ? Math.min(100, Math.round((boqExecutedTotal / boqPlannedTotal) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>{selectedBoqItems.length} postes au bordereau</span>
                    <span>
                      {boqPlannedTotal > 0 ? Math.round((boqExecutedTotal / boqPlannedTotal) * 100) : 0}% exécuté
                    </span>
                  </div>
                </div>

                {/* Quick actions for current project */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handleOpenSurveyModal}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-1.5"
                  >
                    <ClipboardList size={14} />
                    <span>Métré Contradictoire (Attachement)</span>
                  </button>
                  <button
                    onClick={() => setIsDgpModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200 text-xs font-medium flex items-center gap-1.5"
                  >
                    <DollarSign size={14} />
                    <span>Émettre Décompte Provisoire (DGP)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('boq')}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-xs font-medium flex items-center gap-1.5"
                  >
                    <span>Consulter BPU Complet</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Latest Daily Log & Site Safety */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <Sun size={16} className="text-amber-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                        Dernier Journal de Chantier
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {dailyLogs[0]?.date || 'Aujourd\'hui'}
                    </span>
                  </div>

                  {dailyLogs[0] ? (
                    <div className="space-y-3 mt-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Météo & Climat :</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {dailyLogs[0].weather}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Effectif présent sur site :</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                          <Users size={13} className="text-amber-600" />
                          {dailyLogs[0].headcountWorkers} ouvriers & techniciens
                        </span>
                      </div>
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="text-[11px] text-neutral-400">Tâches majeures réalisées :</div>
                        <p className="text-neutral-700 dark:text-neutral-300 mt-1 line-clamp-3">
                          {dailyLogs[0].tasksAccomplished}
                        </p>
                      </div>
                      <div className="pt-1">
                        <div className="text-[11px] text-neutral-400">Sécurité & Qualité (HSE) :</div>
                        <p className="text-emerald-700 dark:text-emerald-400 mt-0.5 text-[11px]">
                          {dailyLogs[0].incidentsSafety}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      Aucun journal saisi pour ce chantier.
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsDailyLogModalOpen(true)}
                  className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Ajouter Rapport Journalier
                </button>
              </div>
            </div>

            {/* Recent Situations Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Situations Mensuelles de Travaux (DGP)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Décomptes périodiques certifiés par le bureau d'études et déduction de garantie
                  </p>
                </div>
                <button
                  onClick={() => setIsDgpModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Nouvelle Situation (DGP)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase tracking-wider font-semibold text-[11px] border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-4 py-3">Réf Situation</th>
                      <th className="px-4 py-3">Période / Chantier</th>
                      <th className="px-4 py-3">Montant Brut Période</th>
                      <th className="px-4 py-3">Retenue 5%</th>
                      <th className="px-4 py-3">TVA (19%)</th>
                      <th className="px-4 py-3">Net à Décaisser</th>
                      <th className="px-4 py-3">Statut Circuit</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {dgps.map((dgp) => (
                      <tr key={dgp.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                          {dgp.dgpNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {dgp.periodLabel}
                          </div>
                          <div className="text-[11px] text-neutral-400">{dgp.issuedDate}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                          {formatMoney(dgp.periodGrossDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-600">
                          -{formatMoney(dgp.retentionGuaranteeDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-500">
                          +{formatMoney(dgp.tvaAmountDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-neutral-900 dark:text-white">
                          {formatMoney(dgp.netPayableDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              dgp.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : dgp.status === 'ApprovedBE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {dgp.status === 'Paid'
                              ? 'Payé / Encaissé'
                              : dgp.status === 'ApprovedBE'
                              ? 'Validé Bureau d\'Études'
                              : 'Soumis au Client'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                          {dgp.status !== 'Paid' && (
                            <button
                              onClick={() => handleAdvanceDgpStatus(dgp.id)}
                              className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-[11px] font-medium"
                            >
                              Avancer Statut
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintDgp(dgp)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded text-[11px] font-medium inline-flex items-center gap-1"
                          >
                            <Printer size={12} />
                            <span>Imprimer DGP</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROJECTS & CHANTIERS */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher code, projet, client..."
                    className="pl-8 pr-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs w-64 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="all">Tous les Statuts</option>
                  <option value="InProgress">En cours d'exécution</option>
                  <option value="ProvisionalHandover">Réception Provisoire</option>
                  <option value="SitePreparation">Préparation de Chantier</option>
                </select>
              </div>

              <button
                onClick={() => setIsNewProjectModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>Nouveau Chantier</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects
                .filter((p) => {
                  const matchSearch =
                    p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchStatus = filterStatus === 'all' || p.status === filterStatus;
                  return matchSearch && matchStatus;
                })
                .map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedProjectId === proj.id
                        ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-500'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {proj.projectCode}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          proj.status === 'InProgress'
                            ? 'bg-blue-100 text-blue-800'
                            : proj.status === 'ProvisionalHandover'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {proj.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white mt-2 line-clamp-1">
                      {proj.projectName}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">{proj.clientName}</p>

                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Montant Marché :</span>
                        <span className="font-mono font-bold text-amber-600">
                          {formatMoney(proj.contractAmountDzd, 'DZD')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Retenue Garantie (5%) :</span>
                        <span className="font-mono text-emerald-600">
                          {formatMoney(proj.retentionAmountDzd, 'DZD')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Superviseur :</span>
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          {proj.supervisorName}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-500">Avancement</span>
                        <span className="font-mono font-bold text-amber-600">{proj.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{ width: `${proj.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: BOQ / BPU BORDEREAU DES PRIX */}
        {activeTab === 'boq' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Bordereau des Prix Unitaires & Détail Estimatif (BPU / BOQ)
                </h3>
                <p className="text-xs text-neutral-500">
                  Décomposition des corps d'états (Terrassement, Gros Œuvres, Second Œuvre, VRD)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenSurveyModal}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <ClipboardList size={14} />
                  <span>Saisie Attachement Métrés</span>
                </button>
                <button
                  onClick={() => setIsBoqModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Nouveau Poste BOQ</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase tracking-wider font-semibold text-[11px] border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Désignation des Ouvrages</th>
                      <th className="px-4 py-3 text-center">Unité</th>
                      <th className="px-4 py-3 text-right">Qté Prévue</th>
                      <th className="px-4 py-3 text-right">Prix Unitaire DZD</th>
                      <th className="px-4 py-3 text-right">Total Prévu DZD</th>
                      <th className="px-4 py-3 text-right">Qté Exécutée</th>
                      <th className="px-4 py-3 text-right">Total Exécuté DZD</th>
                      <th className="px-4 py-3 text-center">% Avanc.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {selectedBoqItems.map((item) => {
                      const pct =
                        item.plannedQty > 0
                          ? Math.min(100, Math.round((item.executedQty / item.plannedQty) * 100))
                          : 0;
                      return (
                        <tr key={item.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-amber-600">
                            {item.itemCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white max-w-sm">
                            {item.designation}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-neutral-500">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                            {item.plannedQty.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                            {formatMoney(item.unitPriceDzd, 'DZD')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-900 dark:text-white">
                            {formatMoney(item.totalPlannedDzd, 'DZD')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-amber-700 dark:text-amber-400 font-bold">
                            {item.executedQty.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                            {formatMoney(item.totalExecutedDzd, 'DZD')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                pct === 100
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pct > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-neutral-50 dark:bg-neutral-800/80 font-bold text-xs border-t-2 border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right uppercase text-neutral-500">
                        Total Marché / Exécution Contradictoire :
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-900 dark:text-white">
                        {formatMoney(boqPlannedTotal, 'DZD')}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">
                        {formatMoney(boqExecutedTotal, 'DZD')}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-amber-600">
                        {boqPlannedTotal > 0
                          ? Math.round((boqExecutedTotal / boqPlannedTotal) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PROGRESS & SITE LOGS */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Journal de Chantier & Suivi d'Attachements
                </h3>
                <p className="text-xs text-neutral-500">
                  Consignation obligatoire des effectifs, conditions météo, incidents HSE et métrés contradictoires
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenSurveyModal}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <ClipboardList size={14} />
                  <span>Attachement des Travaux</span>
                </button>
                <button
                  onClick={() => setIsDailyLogModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Nouvelle Page Journal</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono font-bold text-sm text-neutral-900 dark:text-white">
                      <Calendar size={15} className="text-amber-600" />
                      <span>{log.date}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                      {log.weather === 'Ensoleillé' && <Sun size={12} className="text-amber-500" />}
                      {log.weather === 'Pluvieux' && <CloudRain size={12} className="text-blue-500" />}
                      {log.weather.includes('Venteux') && <Wind size={12} className="text-teal-500" />}
                      <span>{log.weather}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div>
                      <span className="text-neutral-400">Effectif Présent :</span>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5 flex items-center gap-1">
                        <Users size={12} className="text-amber-600" />
                        {log.headcountWorkers} Travailleurs
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Signataire :</span>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                        {log.supervisorSignature}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-neutral-400">Matériel & Engins Mobiles :</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {log.equipmentOnSite.map((eq, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-neutral-400">Activités Réalisées :</span>
                    <p className="mt-1 text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800/40 p-2 rounded-lg">
                      {log.tasksAccomplished}
                    </p>
                  </div>

                  <div className="text-xs">
                    <span className="text-neutral-400">Sécurité & Qualité (HSE) :</span>
                    <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                      {log.incidentsSafety}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FINANCE & DGP BILLING */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-xs text-neutral-500">Total Situations Émises</div>
                <div className="text-xl font-bold font-mono mt-1 text-neutral-900 dark:text-white">
                  {formatMoney(
                    selectedDgps.reduce((acc, d) => acc + d.periodGrossDzd, 0),
                    'DZD'
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Montant brut facturé au maître d'ouvrage</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-xs text-neutral-500">Retenues Bloquées sur ce Chantier (5%)</div>
                <div className="text-xl font-bold font-mono mt-1 text-emerald-600">
                  {formatMoney(
                    selectedDgps.reduce((acc, d) => acc + d.retentionGuaranteeDzd, 0),
                    'DZD'
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Garantie contractuelle de parfait achèvement</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-xs text-neutral-500">Net Encaissé / À Encaisser</div>
                <div className="text-xl font-bold font-mono mt-1 text-purple-600">
                  {formatMoney(
                    selectedDgps.reduce((acc, d) => acc + d.netPayableDzd, 0),
                    'DZD'
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Net mandats après TVA et déductions</div>
              </div>
            </div>

            {/* Situations table */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Décomptes Généraux Provisoires (DGP)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Calcul automatique de la retenue de garantie (5%) et amortissement d'avance forfaitaire
                  </p>
                </div>

                <button
                  onClick={() => setIsDgpModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Générer Nouveau DGP</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase tracking-wider font-semibold text-[11px] border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-4 py-3">Réf Décompte</th>
                      <th className="px-4 py-3">Période</th>
                      <th className="px-4 py-3 text-right">Cumul Antérieur</th>
                      <th className="px-4 py-3 text-right">Travaux Période</th>
                      <th className="px-4 py-3 text-right">Retenue 5%</th>
                      <th className="px-4 py-3 text-right">Amort. Avance</th>
                      <th className="px-4 py-3 text-right">TVA 19%</th>
                      <th className="px-4 py-3 text-right">Net à Mandater</th>
                      <th className="px-4 py-3 text-center">Statut</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {selectedDgps.map((dgp) => (
                      <tr key={dgp.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-amber-600">
                          {dgp.dgpNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">
                          {dgp.periodLabel}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-500">
                          {formatMoney(dgp.previousCumulDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                          {formatMoney(dgp.periodGrossDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600">
                          -{formatMoney(dgp.retentionGuaranteeDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-500">
                          -{formatMoney(dgp.advanceAmortizationDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-500">
                          +{formatMoney(dgp.tvaAmountDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                          {formatMoney(dgp.netPayableDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              dgp.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : dgp.status === 'ApprovedBE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {dgp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handlePrintDgp(dgp)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-medium text-[11px] inline-flex items-center gap-1"
                          >
                            <Printer size={12} />
                            <span>Imprimer</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: NEW PROJECT */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <HardHat className="text-amber-600" size={20} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Nouveau Chantier / Projet BTP
                </h3>
              </div>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Code Chantier</label>
                <input
                  type="text"
                  value={newProjectForm.projectCode}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, projectCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Maître d'Ouvrage (Client)</label>
                <input
                  type="text"
                  placeholder="Ex: SPA Promoville, APC Chéraga"
                  value={newProjectForm.clientName}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, clientName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-neutral-500 font-medium mb-1">Intitulé du Projet</label>
                <input
                  type="text"
                  placeholder="Ex: Réalisation 120 Logements Promotionnels & Commerces"
                  value={newProjectForm.projectName}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, projectName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-neutral-500 font-medium mb-1">Lieu & Wilaya du Site</label>
                <input
                  type="text"
                  placeholder="Ex: ZUN Chéraga Ouest, Alger"
                  value={newProjectForm.siteLocation}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, siteLocation: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Montant Contractuel TTC (DZD)</label>
                <input
                  type="number"
                  value={newProjectForm.contractAmountDzd}
                  onChange={(e) =>
                    setNewProjectForm({ ...newProjectForm, contractAmountDzd: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Taux Retenue Garantie (%)</label>
                <input
                  type="number"
                  value={newProjectForm.retentionGuaranteePercent}
                  onChange={(e) =>
                    setNewProjectForm({
                      ...newProjectForm,
                      retentionGuaranteePercent: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Date Ordre de Service (ODS)</label>
                <input
                  type="date"
                  value={newProjectForm.startDate}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Délai Contractuel (Fin Prévue)</label>
                <input
                  type="date"
                  value={newProjectForm.targetEndDate}
                  onChange={(e) =>
                    setNewProjectForm({ ...newProjectForm, targetEndDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-neutral-500 font-medium mb-1">Ingénieur / Conducteur de Travaux</label>
                <input
                  type="text"
                  value={newProjectForm.supervisorName}
                  onChange={(e) =>
                    setNewProjectForm({ ...newProjectForm, supervisorName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                Créer Chantier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW BOQ ITEM */}
      {isBoqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ClipboardList className="text-amber-600" size={20} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Ajouter un Poste au Bordereau (BOQ/BPU)
                </h3>
              </div>
              <button
                onClick={() => setIsBoqModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Code Poste</label>
                  <input
                    type="text"
                    value={newBoqForm.itemCode}
                    onChange={(e) => setNewBoqForm({ ...newBoqForm, itemCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Unité</label>
                  <select
                    value={newBoqForm.unit}
                    onChange={(e) =>
                      setNewBoqForm({
                        ...newBoqForm,
                        unit: e.target.value as ContractorBoqItem['unit'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  >
                    <option value="m2">m2 (Surface)</option>
                    <option value="m3">m3 (Volume)</option>
                    <option value="ml">ml (Linéaire)</option>
                    <option value="kg">kg (Poids)</option>
                    <option value="ton">Tonne</option>
                    <option value="forfait">Forfait</option>
                    <option value="unit">Unité</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Quantité Prévue</label>
                  <input
                    type="number"
                    value={newBoqForm.plannedQty}
                    onChange={(e) => setNewBoqForm({ ...newBoqForm, plannedQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Désignation Technique de l'Ouvrage</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Revêtement de sol en grès cérame émaillé 60x60 premier choix avec plinthes assorties"
                  value={newBoqForm.designation}
                  onChange={(e) => setNewBoqForm({ ...newBoqForm, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Prix Unitaire DZD (H.T.)</label>
                <input
                  type="number"
                  value={newBoqForm.unitPriceDzd}
                  onChange={(e) =>
                    setNewBoqForm({ ...newBoqForm, unitPriceDzd: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                />
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg flex justify-between items-center text-xs">
                <span className="text-neutral-500">Total Prévisionnel du Poste :</span>
                <span className="font-mono font-bold text-amber-600">
                  {formatMoney(newBoqForm.plannedQty * newBoqForm.unitPriceDzd, 'DZD')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsBoqModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateBoqItem}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                Ajouter au Devis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ATTACHEMENT CONTRADICTOIRE DES MÉTRÉS */}
      {isSurveyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ClipboardList className="text-amber-600" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Attachement Mensuel Contradictoire de Travaux
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Saisie des métrés réels réalisés sur chantier visés par l'ingénieur conseil
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSurveyModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Code</th>
                      <th className="px-3 py-2.5">Désignation</th>
                      <th className="px-3 py-2.5 text-center">Unité</th>
                      <th className="px-3 py-2.5 text-right">Qté Marché</th>
                      <th className="px-3 py-2.5 text-right">Qté Réalisée à Date</th>
                      <th className="px-3 py-2.5 text-right">Montant Exécuté</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {selectedBoqItems.map((item) => {
                      const cur = surveyQuantities[item.id] !== undefined ? surveyQuantities[item.id] : item.executedQty;
                      const lineTotal = cur * item.unitPriceDzd;
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-mono font-bold text-amber-600">{item.itemCode}</td>
                          <td className="px-3 py-2 font-medium text-neutral-800 dark:text-neutral-200 max-w-xs truncate">
                            {item.designation}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-neutral-500">{item.unit}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.plannedQty}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={cur}
                              onChange={(e) =>
                                setSurveyQuantities({
                                  ...surveyQuantities,
                                  [item.id]: Number(e.target.value),
                                })
                              }
                              className="w-24 px-2 py-1 text-right font-mono font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                            {formatMoney(lineTotal, 'DZD')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">
                La validation mettra à jour l'avancement global du chantier et le calcul du prochain décompte.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsSurveyModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveSurvey}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Enregistrer l'Attachement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DAILY LOG MODAL */}
      {isDailyLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Calendar className="text-amber-600" size={20} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Page Journal de Chantier
                </h3>
              </div>
              <button
                onClick={() => setIsDailyLogModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={newLogForm.date}
                    onChange={(e) => setNewLogForm({ ...newLogForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Météo</label>
                  <select
                    value={newLogForm.weather}
                    onChange={(e) =>
                      setNewLogForm({
                        ...newLogForm,
                        weather: e.target.value as ContractorDailyLog['weather'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  >
                    <option value="Ensoleillé">Ensoleillé</option>
                    <option value="Pluvieux">Pluvieux</option>
                    <option value="Venteux / Sirocco">Venteux / Sirocco</option>
                    <option value="Canicule">Canicule</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Effectif Ouvriers sur Site</label>
                  <input
                    type="number"
                    value={newLogForm.headcountWorkers}
                    onChange={(e) =>
                      setNewLogForm({ ...newLogForm, headcountWorkers: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Visé par (Signature)</label>
                  <input
                    type="text"
                    value={newLogForm.supervisorSignature}
                    onChange={(e) =>
                      setNewLogForm({ ...newLogForm, supervisorSignature: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Engins Mobiles Actifs</label>
                <input
                  type="text"
                  placeholder="Grue à tour, Toupie béton, Manitou télescopique"
                  value={newLogForm.equipment}
                  onChange={(e) => setNewLogForm({ ...newLogForm, equipment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Tâches Accomplies Aujourd'hui</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Pose treillis soudé dalle R+3, coulage béton armé 120m3, contrôle laboratoire béton conforme."
                  value={newLogForm.tasksAccomplished}
                  onChange={(e) =>
                    setNewLogForm({ ...newLogForm, tasksAccomplished: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Sécurité / Incidents / Intempéries</label>
                <input
                  type="text"
                  value={newLogForm.incidentsSafety}
                  onChange={(e) =>
                    setNewLogForm({ ...newLogForm, incidentsSafety: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsDailyLogModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateDailyLog}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                Valider Page Journal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: NEW DGP GENERATOR */}
      {isDgpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <FileText className="text-amber-600" size={20} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Émettre Décompte Général Provisoire (DGP)
                </h3>
              </div>
              <button
                onClick={() => setIsDgpModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Intitulé de la Situation</label>
                <input
                  type="text"
                  value={newDgpForm.periodLabel}
                  onChange={(e) => setNewDgpForm({ ...newDgpForm, periodLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Taux TVA (%)</label>
                  <select
                    value={newDgpForm.tvaPercent}
                    onChange={(e) =>
                      setNewDgpForm({ ...newDgpForm, tvaPercent: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  >
                    <option value={19}>19% (Taux Normal BTP / Tertiaire)</option>
                    <option value={9}>9% (Taux Réduit Logement Social / LPA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Amortissement Avance (%)</label>
                  <input
                    type="number"
                    value={newDgpForm.advanceAmortizationPercent}
                    onChange={(e) =>
                      setNewDgpForm({
                        ...newDgpForm,
                        advanceAmortizationPercent: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cumul Exécuté à Date (Bordereau) :</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney(boqExecutedTotal, 'DZD')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Retenue de Garantie (5%) :</span>
                  <span className="font-mono text-emerald-600">
                    -{formatMoney((boqExecutedTotal * (selectedProject?.retentionGuaranteePercent || 5)) / 100, 'DZD')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Amortissement Avance Forfaitaire :</span>
                  <span className="font-mono text-neutral-500">
                    -{formatMoney((boqExecutedTotal * newDgpForm.advanceAmortizationPercent) / 100, 'DZD')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsDgpModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateDgp}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Générer Décompte Officiel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PRINTABLE DGP DOCUMENT */}
      {isPrintModalOpen && dgpToPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none font-sans">
            <div className="flex items-center justify-between pb-4 border-b-2 border-neutral-900 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-amber-600" size={20} />
                <span className="font-bold text-sm">Aperçu Impression Décompte Officiel</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base font-extrabold tracking-tight uppercase text-neutral-900">
                    RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
                  </h2>
                  <p className="text-xs font-bold text-neutral-700 mt-0.5">
                    MARCHÉS DE TRAVAUX PUBLICS & BÂTIMENT (CCAG)
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Entreprise de Réalisation : Atrium BTP & Génie Civil
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-amber-700">
                    {dgpToPrint.dgpNumber}
                  </div>
                  <div className="text-xs text-neutral-500">Date : {dgpToPrint.issuedDate}</div>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
                <div className="font-bold text-sm text-neutral-800 uppercase">
                  {selectedProject?.projectName}
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-neutral-500">Maître d'Ouvrage :</span>
                  <span className="font-semibold">{selectedProject?.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Implantation :</span>
                  <span>{selectedProject?.siteLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Montant Contractuel Marché TTC :</span>
                  <span className="font-mono font-bold">
                    {formatMoney(selectedProject?.contractAmountDzd || 0, 'DZD')}
                  </span>
                </div>
              </div>

              <div className="text-center font-bold text-sm tracking-wide uppercase border-y border-neutral-300 py-2">
                DÉCOMPTE GÉNÉRAL PROVISOIRE ({dgpToPrint.periodLabel})
              </div>

              {/* Financial Calculation Table */}
              <div className="border border-neutral-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Désignation des Décomptes</th>
                      <th className="px-3 py-2 text-right">Montant (DZD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-mono">
                    <tr>
                      <td className="px-3 py-2 text-neutral-700">
                        1. Montant Cumulé Brut des Travaux Exécutés à ce jour
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formatMoney(dgpToPrint.grossCompletedDzd, 'DZD')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-neutral-700">
                        2. À déduire : Décomptes Précédents (Cumul Antérieur)
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-500">
                        -{formatMoney(dgpToPrint.previousCumulDzd, 'DZD')}
                      </td>
                    </tr>
                    <tr className="bg-neutral-50 font-bold">
                      <td className="px-3 py-2 text-neutral-900">
                        3. Montant Brut des Travaux du Mois
                      </td>
                      <td className="px-3 py-2 text-right text-amber-700">
                        {formatMoney(dgpToPrint.periodGrossDzd, 'DZD')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-neutral-700">
                        4. À déduire : Retenue de Garantie Légale (5%)
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-700">
                        -{formatMoney(dgpToPrint.retentionGuaranteeDzd, 'DZD')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-neutral-700">
                        5. À déduire : Remboursement Avance Forfaitaire Contractuelle
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-500">
                        -{formatMoney(dgpToPrint.advanceAmortizationDzd, 'DZD')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-neutral-700">
                        6. Plus : TVA ({dgpToPrint.tvaPercent}%)
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-600">
                        +{formatMoney(dgpToPrint.tvaAmountDzd, 'DZD')}
                      </td>
                    </tr>
                    <tr className="bg-neutral-100 font-extrabold text-sm border-t-2 border-neutral-900">
                      <td className="px-3 py-2.5 uppercase text-neutral-900">
                        NET À MANDATER EN FAVEUR DE L'ENTREPRISE
                      </td>
                      <td className="px-3 py-2.5 text-right text-neutral-900">
                        {formatMoney(dgpToPrint.netPayableDzd, 'DZD')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures & Visas */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-300 text-[11px] text-center">
                <div className="border border-neutral-300 rounded-lg p-3 h-28 flex flex-col justify-between">
                  <div className="font-bold">L'Entrepreneur</div>
                  <div className="text-[10px] text-neutral-400">Cachet & Signature</div>
                </div>
                <div className="border border-neutral-300 rounded-lg p-3 h-28 flex flex-col justify-between">
                  <div className="font-bold">Le Maître d'Œuvre (BET)</div>
                  <div className="text-[10px] text-neutral-400">Vu et Approuvé</div>
                </div>
                <div className="border border-neutral-300 rounded-lg p-3 h-28 flex flex-col justify-between">
                  <div className="font-bold">Le Maître de l'Ouvrage</div>
                  <div className="text-[10px] text-neutral-400">Bon à Payer / Ordonnancement</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
