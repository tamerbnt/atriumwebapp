import { useState, useEffect } from 'react';
import {
  ContractorProject,
  ContractorBoqItem,
  ContractorDailyLog,
  ContractorDgp,
} from '../../../types/index';

const INITIAL_PROJECTS: ContractorProject[] = [
  {
    id: 'proj_btp_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
];

const INITIAL_BOQ_ITEMS: ContractorBoqItem[] = [
  {
    id: 'boq_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
];

const INITIAL_LOGS: ContractorDailyLog[] = [
  {
    id: 'log_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
];

const INITIAL_DGPS: ContractorDgp[] = [
  {
    id: 'dgp_01',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
    businessId: 'biz_contractor',
    branchId: 'branch_contractor_main',
    staffId: 'staff_01',
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
];

export const useContractorData = () => {
  const [projects, setProjects] = useState<ContractorProject[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_projects');
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [boqItems, setBoqItems] = useState<ContractorBoqItem[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_boq');
      return saved ? JSON.parse(saved) : INITIAL_BOQ_ITEMS;
    } catch {
      return INITIAL_BOQ_ITEMS;
    }
  });

  const [dailyLogs, setDailyLogs] = useState<ContractorDailyLog[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_logs');
      return saved ? JSON.parse(saved) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const [dgps, setDgps] = useState<ContractorDgp[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_contractor_dgps');
      return saved ? JSON.parse(saved) : INITIAL_DGPS;
    } catch {
      return INITIAL_DGPS;
    }
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj_btp_01');

  useEffect(() => {
    try {
      localStorage.setItem('atrium_contractor_projects', JSON.stringify(projects));
    } catch {}
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_contractor_boq', JSON.stringify(boqItems));
    } catch {}
  }, [boqItems]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_contractor_logs', JSON.stringify(dailyLogs));
    } catch {}
  }, [dailyLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('atrium_contractor_dgps', JSON.stringify(dgps));
    } catch {}
  }, [dgps]);

  const addProject = (project: ContractorProject) => {
    setProjects((prev) => [project, ...prev]);
  };

  const updateProject = (project: ContractorProject) => {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const addBoqItem = (item: ContractorBoqItem) => {
    setBoqItems((prev) => [...prev, item]);
  };

  const updateBoqItem = (item: ContractorBoqItem) => {
    setBoqItems((prev) => prev.map((b) => (b.id === item.id ? item : b)));
  };

  const deleteBoqItem = (id: string) => {
    setBoqItems((prev) => prev.filter((b) => b.id !== id));
  };

  const addDailyLog = (log: ContractorDailyLog) => {
    setDailyLogs((prev) => [log, ...prev]);
  };

  const addDgp = (dgp: ContractorDgp) => {
    setDgps((prev) => [dgp, ...prev]);
  };

  const updateDgpStatus = (id: string, status: ContractorDgp['status']) => {
    setDgps((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  return {
    projects,
    boqItems,
    dailyLogs,
    dgps,
    selectedProjectId,
    setSelectedProjectId,
    addProject,
    updateProject,
    deleteProject,
    addBoqItem,
    updateBoqItem,
    deleteBoqItem,
    addDailyLog,
    addDgp,
    updateDgpStatus,
  };
};
