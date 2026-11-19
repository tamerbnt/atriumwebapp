import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LegalMatter,
  LegalHearing,
  CPCADeadline,
  NotaryDeed,
  EscrowAccount,
  SCFJournalEntry,
  CashReceipt,
  DailyCashClosure,
  LegalClientEntity,
} from '../../../types';
import { calculateCPCADeadline, calculateNotaryDecret08243, calculateArticle317Stamp } from '../../../utils/legalRules';
import { useAtriumSelector } from '../../../services/store';
import { useIdlePersist } from '../../../hooks/useIdlePersist';
import type { Dispatch, SetStateAction } from 'react';
import { isSupabaseConfigured, legalService, realtimeService, syncCoordinator, runWithConcurrency } from '../../../lib/supabase';

function mergeLegalById<T extends { id: string }>(prev: T[], remote: T[]): T[] {
  if (remote.length === 0) return prev;
  const map = new Map<string, T>();
  for (const item of prev) map.set(item.id, item);
  for (const item of remote) map.set(item.id, item);
  return Array.from(map.values());
}

export const INITIAL_LEGAL_ENTITIES: LegalClientEntity[] = [
  {
    id: 'ent_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    clientType: 'personne_morale',
    nameFr: 'SARL Atlas Distribution & Logistique',
    nameAr: 'شركة أطلس للتوزيع واللوجستيك ذ.م.م',
    ninOrNif: '001916012345678', // 15 digits NIF
    commercialRegistryNumber: '16/00-0987654B19',
    phone: '023 50 11 22',
    email: 'contact@atlas-logistique.dz',
    addressFr: '14 Rue Didouche Mourad, Alger Centre',
    addressAr: '14 شارع ديدوش مراد، الجزائر الوسطى',
    wilaya: 'Alger',
    courtJurisdiction: 'Tribunal de Sidi M\'Hamed (Chambre Commerciale)',
    activeMattersCount: 2,
    outstandingBalanceDzd: 180000,
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'ent_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    clientType: 'personne_physique',
    nameFr: 'Hadj Amine Mansouri',
    nameAr: 'الحاج أمين منصوري',
    ninOrNif: '197516010045678912', // 18 digits NIN
    phone: '0550 12 34 56',
    email: 'amine.mansouri@gmail.com',
    addressFr: 'Lotissement El Biar N° 42, Alger',
    addressAr: 'تجزئة الأبيار رقم 42، الجزائر',
    wilaya: 'Alger',
    courtJurisdiction: 'Cour d\'Alger (Section Statut Personnel)',
    activeMattersCount: 1,
    outstandingBalanceDzd: 0,
    createdAt: '2026-02-10T10:30:00Z',
  },
  {
    id: 'ent_03',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    clientType: 'personne_morale',
    nameFr: 'EURL Méditerranée Agro-Industrie',
    nameAr: 'مؤسسة البحر الأبيض المتوسط للصناعات الغذائية ذ.ش.و.ذ.م.م',
    ninOrNif: '002016098765432',
    commercialRegistryNumber: '16/00-4567891A20',
    phone: '021 44 77 88',
    email: 'direction@med-agro.dz',
    addressFr: 'Zone Industrielle Oued Smar, Lot 18',
    addressAr: 'المنطقة الصناعية واد السمار، الحصة 18',
    wilaya: 'Alger',
    courtJurisdiction: 'Tribunal de Dar El Beïda',
    activeMattersCount: 2,
    outstandingBalanceDzd: 340000,
    createdAt: '2026-03-01T11:00:00Z',
  },
];

export const INITIAL_MATTERS: LegalMatter[] = [
  {
    id: 'mat_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterNumber: 'DOS-2026-0091',
    title: 'Contentieux Commercial / Recouvrement Créance SARL Atlas c/ SPA BTP',
    titleAr: 'نزاع تجاري / تحصيل دين شركة أطلس ضد ش.ذ.أ للبناء',
    category: 'Commercial',
    clientName: 'SARL Atlas Distribution & Logistique',
    clientNameAr: 'شركة أطلس للتوزيع واللوجستيك ذ.م.م',
    clientPhone: '0555 88 99 00',
    clientNinOrNif: '001916012345678',
    adversePartyName: 'SPA BTP Méditerranée',
    adversePartyNameAr: 'ش.ذ.أ للبناء المتوسطي',
    courtJurisdiction: 'Tribunal de Sidi M\'Hamed, Alger',
    chamber: 'Chambre Commerciale 2',
    assignedLawyer: 'Maître Y. Cherif (Avocat à la Cour)',
    retainerAmountDzd: 250000,
    trustEscrowBalanceDzd: 1200000,
    status: 'PendingHearing',
    nextHearingDate: '2026-05-22',
    cpcaDeadlineId: 'cpca_01',
    notes: 'Requête introductive déposée le 14 Avril 2026. Attente communication des pièces adverses.',
    createdAt: '2026-05-01T08:00:00Z',
  },
  {
    id: 'mat_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterNumber: 'DOS-2026-0092',
    title: 'Règlement Successoral & Partage Immobilier Famille Mansouri',
    titleAr: 'تصفية تركة وقسمة عقارية لورثة المرحوم منصوري',
    category: 'Civil',
    clientName: 'Hadj Amine Mansouri',
    clientNameAr: 'الحاج أمين منصوري',
    clientPhone: '0661 44 55 66',
    clientNinOrNif: '197516010045678912',
    courtJurisdiction: 'Cour d\'Alger, Section Statut Personnel',
    chamber: 'Chambre du Statut Personnel',
    assignedLawyer: 'Maître L. Boumediene (Notaire & Avocat)',
    retainerAmountDzd: 180000,
    trustEscrowBalanceDzd: 8500000,
    status: 'Active',
    nextHearingDate: '2026-06-05',
    notes: 'Acte de Frédha établi le 12 Février. Expertise foncière en cours.',
    createdAt: '2026-05-04T09:00:00Z',
  },
  {
    id: 'mat_03',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterNumber: 'DOS-2026-0093',
    title: 'Litige Social / Licenciement Abusif Boualem c/ EURL Agro',
    titleAr: 'نزاع عمالي / تسريح تعسفي بوعلام ضد مؤسسة أغرو',
    category: 'Labor',
    clientName: 'EURL Méditerranée Agro-Industrie',
    clientNameAr: 'مؤسسة البحر الأبيض المتوسط للصناعات الغذائية ذ.ش.و.ذ.م.م',
    clientPhone: '021 44 77 88',
    clientNinOrNif: '002016098765432',
    adversePartyName: 'S. Boualem (Ex-Chef Magasinier)',
    courtJurisdiction: 'Tribunal de Dar El Beïda, Section Sociale',
    chamber: 'Section Sociale',
    assignedLawyer: 'Maître Y. Cherif (Avocat à la Cour)',
    retainerAmountDzd: 150000,
    trustEscrowBalanceDzd: 0,
    status: 'Active',
    nextHearingDate: '2026-05-18',
    notes: 'Procès-verbal de non-conciliation de l\'inspection du travail versé au dossier.',
    createdAt: '2026-05-06T14:00:00Z',
  },
];

export const INITIAL_HEARINGS: LegalHearing[] = [
  {
    id: 'hear_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterId: 'mat_01',
    matterNumber: 'DOS-2026-0091',
    matterTitle: 'Contentieux Commercial / Recouvrement Créance SARL Atlas c/ SPA BTP',
    matterTitleAr: 'نزاع تجاري / تحصيل دين شركة أطلس ضد ش.ذ.أ للبناء',
    hearingDate: '2026-05-22',
    hearingTime: '09:30',
    courtName: 'Tribunal de Sidi M\'Hamed (Chambre Commerciale 2)',
    courtRoom: 'Salle 04',
    chamber: 'Chambre Commerciale',
    benchJudge: 'Président Benalia',
    presidingJudge: 'Mme Le Procureur Adjoint',
    purpose: 'Plaidoirie sur le fond & communication de pièces contradictoires',
    purposeAr: 'المرافعة في الموضوع وتبادل المستندات والوثائق',
    resultSummary: 'En attente d\'audience',
    postponementCode: 'RPP',
    isCompleted: false,
    status: 'Scheduled',
  },
  {
    id: 'hear_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterId: 'mat_03',
    matterNumber: 'DOS-2026-0093',
    matterTitle: 'Litige Social / Licenciement Abusif Boualem c/ EURL Agro',
    matterTitleAr: 'نزاع عمالي / تسريح تعسفي بوعلام ضد مؤسسة أغرو',
    hearingDate: '2026-05-18',
    hearingTime: '10:15',
    courtName: 'Tribunal de Dar El Beïda (Section Sociale)',
    courtRoom: 'Salle 02',
    chamber: 'Section Sociale',
    benchJudge: 'Président Khelil',
    purpose: 'Audition des témoins & rapport d\'expertise sociale',
    purposeAr: 'سماع الشهود ومناقشة تقرير الخبرة القضائية',
    resultSummary: 'Renvoi sollicité par la défense pour réplique écrite',
    postponementCode: 'RPO',
    isCompleted: false,
    status: 'Scheduled',
  },
];

export const INITIAL_CPCA_DEADLINES: CPCADeadline[] = [
  {
    id: 'cpca_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterId: 'mat_01',
    caseNumber: '26/01482',
    courtJurisdiction: 'Tribunal de Sidi M\'Hamed',
    chamber: 'Chambre Commerciale 2',
    recourseType: 'appel_commercial',
    notificationDate: '2026-04-16',
    bailiffName: 'Maître Farouk Ziane (Huissier de Justice à Alger)',
    domicileCategory: 'local',
    statutoryBaseDays: 30,
    distanceExtensionDays: 0,
    terminalExpiryDate: '2026-05-17T16:30:00+01:00', // Prorogé Art. 405
    isRolledOver: true,
    rolloverReason: 'Vendredi 15 Mai & Samedi 16 Mai chômés -> Report au Dimanche 17 Mai à 16:30 (Art. 405 CPCA)',
    status: 'running',
    notes: 'Jugement n° 412/26 signifié à personne. Mémoire d\'appel en cours de finalisation.',
    createdAt: '2026-04-16T11:00:00Z',
  },
  {
    id: 'cpca_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterId: 'mat_03',
    caseNumber: '26/00889',
    courtJurisdiction: 'Tribunal de Dar El Beïda',
    chamber: 'Section Sociale',
    recourseType: 'opposition',
    notificationDate: '2026-05-02',
    bailiffName: 'Maître Rachid Bensaïd (Huissier à Rouiba)',
    domicileCategory: 'local',
    statutoryBaseDays: 10,
    distanceExtensionDays: 0,
    terminalExpiryDate: '2026-05-12T16:30:00+01:00',
    isRolledOver: false,
    status: 'approaching',
    notes: 'Jugement par défaut à attaquer d\'urgence sous 10 jours (Art. 329 CPCA).',
    createdAt: '2026-05-02T15:00:00Z',
  },
];

export const INITIAL_NOTARY_DEEDS: NotaryDeed[] = [
  {
    id: 'deed_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    repertoireNumber: '2026/00142',
    repertoireIndex: 142,
    actType: 'vente_immobiliere',
    title: 'Vente Immobilière Appartement F4 Haut Standing El Biar',
    titleAr: 'عقد بيع عقاري لشقة ذات 4 غرف عالية الطراز بالأبيار',
    transactionValueDzd: 18000000, // 1.8 Milliard Centimes
    parties: {
      vendorName: 'Hadj Amine Mansouri',
      vendorNin: '197516010045678912',
      purchaserName: 'Dr. Mourad Belkacem',
      purchaserNin: '198216010098765432',
    },
    cadastralReference: {
      wilaya: 'Alger',
      commune: 'El Biar',
      section: '04',
      ilot: '18',
      lotNumber: 'Lot 12 - Bloc B',
      livretFoncierNumber: 'LF-16/04-0982',
    },
    financials: {
      honorairesHtDzd: 142500, // Décret 08-243
      tvaAmountDzd: 27075,
      droitsEnregistrementDzd: 450000, // 2.5%
      droitsPubliciteDzd: 180000, // 1.0%
      totalProvisionClientDzd: 799575,
    },
    status: 'publie_conservation',
    signedAt: '2026-04-10T14:30:00Z',
    conservationVolume: 'Vol. 418',
    conservationNumber: 'N° 22',
    createdAt: '2026-04-02T10:00:00Z',
  },
  {
    id: 'deed_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    repertoireNumber: '2026/00143',
    repertoireIndex: 143,
    actType: 'bail_commercial',
    title: 'Bail Commercial Local Commercial 120m² Didouche Mourad',
    titleAr: 'عقد إيجار تجاري لمحل تجاري 120م² بشارع ديدوش مراد',
    transactionValueDzd: 2400000,
    parties: {
      vendorName: 'SARL Atlas Distribution',
      vendorNin: '001916012345678',
      purchaserName: 'M. Karim Sahli',
      purchaserNin: '198816010011223344',
    },
    financials: {
      honorairesHtDzd: 24000,
      tvaAmountDzd: 4560,
      droitsEnregistrementDzd: 0,
      droitsPubliciteDzd: 0,
      totalProvisionClientDzd: 28560,
    },
    status: 'minute_signed',
    signedAt: '2026-05-02T11:00:00Z',
    createdAt: '2026-04-28T09:00:00Z',
  },
];

export const INITIAL_ESCROW_ACCOUNTS: EscrowAccount[] = [
  {
    id: 'escrow_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterId: 'mat_01',
    matterReference: 'DOS-2026-0091',
    clientName: 'SARL Atlas Distribution',
    beneficiaryName: 'Trésor Public / Consignation Tribunal',
    totalDepositedDzd: 1500000,
    totalDisbursedDzd: 300000,
    currentBalanceDzd: 1200000,
    isLocked: true,
    transactions: [
      {
        id: 'tx_01',
        escrowAccountId: 'escrow_01',
        date: '2026-04-15',
        type: 'deposit_received',
        amountDzd: 1500000,
        paymentMode: 'virement_bancaire',
        bankReference: 'VIR-BNA-009841',
        authorizedByStaff: 'Me Y. Cherif',
        notes: 'Consignation judiciaire ordonnée par jugement avant-dire droit',
      },
      {
        id: 'tx_02',
        escrowAccountId: 'escrow_01',
        date: '2026-04-20',
        type: 'tax_disbursement',
        amountDzd: 300000,
        paymentMode: 'tresor_public',
        bankReference: 'CHQ-TRESOR-0112',
        authorizedByStaff: 'Me Y. Cherif',
        notes: 'Avance sur frais d\'expertise comptable judiciaire',
      },
    ],
  },
  {
    id: 'escrow_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    matterId: 'mat_02',
    matterReference: 'DOS-2026-0092',
    clientName: 'Dr. Mourad Belkacem (Acquéreur)',
    beneficiaryName: 'Hadj Amine Mansouri (Vendeur)',
    totalDepositedDzd: 8500000,
    totalDisbursedDzd: 0,
    currentBalanceDzd: 8500000,
    isLocked: false,
    cadastralClearanceProof: {
      volume: 'Vol. 418',
      number: 'N° 22',
      recordedAt: '2026-04-25',
    },
    transactions: [
      {
        id: 'tx_03',
        escrowAccountId: 'escrow_02',
        date: '2026-04-10',
        type: 'deposit_received',
        amountDzd: 8500000,
        paymentMode: 'cheque_de_banque',
        bankReference: 'CHQ-BEA-9988112',
        authorizedByStaff: 'Me L. Boumediene',
        notes: 'Séquestre du reliquat du prix de vente sous condition de publication foncière',
      },
    ],
  },
];

export const INITIAL_SCF_ENTRIES: SCFJournalEntry[] = [
  {
    id: 'scf_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    entryNumber: 'EC-2026-00411',
    journalCode: 'VE',
    date: '2026-05-02',
    pieceJustificativeRef: 'FAC-2026-089',
    libelle: 'Facturation honoraires conseil juridique SARL Atlas',
    lines: [
      { id: 'l_01', accountNumber: '411000', accountLabel: 'Clients - Créances sur prestations', debitDzd: 238000, creditDzd: 0 },
      { id: 'l_02', accountNumber: '706000', accountLabel: 'Prestations de services juridiques', debitDzd: 0, creditDzd: 200000 },
      { id: 'l_03', accountNumber: '445700', accountLabel: 'TVA collectée sur prestations (19%)', debitDzd: 0, creditDzd: 38000 },
    ],
    totalDebitDzd: 238000,
    totalCreditDzd: 238000,
    isBalanced: true,
    status: 'validated',
  },
  {
    id: 'scf_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    entryNumber: 'EC-2026-00412',
    journalCode: 'CA',
    date: '2026-05-04',
    pieceJustificativeRef: 'RC-2026-0118',
    libelle: 'Encaissement espèces provision dossier Mansouri avec timbre Art. 317',
    lines: [
      { id: 'l_04', accountNumber: '531000', accountLabel: 'Caisse centrale', debitDzd: 50200, creditDzd: 0 },
      { id: 'l_05', accountNumber: '411000', accountLabel: 'Clients - Règlement partiel', debitDzd: 0, creditDzd: 50000 },
      { id: 'l_06', accountNumber: '447200', accountLabel: 'Droit de timbre fiscal collecté (Art. 317)', debitDzd: 0, creditDzd: 200 },
    ],
    totalDebitDzd: 50200,
    totalCreditDzd: 50200,
    isBalanced: true,
    status: 'validated',
  },
];

export const INITIAL_CASH_RECEIPTS: CashReceipt[] = [
  {
    id: 'cr_01',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    receiptNumber: 'RC-2026-0118',
    clientName: 'Hadj Amine Mansouri',
    matterTitle: 'Dossier Successoral Mansouri',
    totalHtDzd: 42017,
    tvaDzd: 7983,
    paymentMethod: 'especes',
    timbreFiscalDzd: 200, // Art. 317 for 50,000 DA
    netCollectedDzd: 50200,
    cashierName: 'Samia Khelifa (Secrétaire)',
    createdAt: '2026-05-04T10:15:00Z',
  },
  {
    id: 'cr_02',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    branchId: 'branch_legal_main',
    staffId: 'staff_01',
    receiptNumber: 'RC-2026-0119',
    clientName: 'Dr. Mourad Belkacem',
    matterTitle: 'Provision Acte Vente Notariée El Biar',
    totalHtDzd: 150000,
    tvaDzd: 28500,
    paymentMethod: 'especes',
    timbreFiscalDzd: 1500, // 1%
    netCollectedDzd: 180000,
    cashierName: 'Samia Khelifa (Secrétaire)',
    createdAt: '2026-05-05T14:40:00Z',
  },
];

export const INITIAL_DAILY_CLOSURE: DailyCashClosure = {
  id: 'close_today',
  accountId: 'acc_01',
  businessId: 'biz_legal',
  branchId: 'branch_legal_main',
  staffId: 'staff_01',
  closureDate: '2026-05-05',
  openingFloatDzd: 25000,
  totalCashReceivedDzd: 230200,
  totalCashDisbursedDzd: 15000, // Frais huissier
  theoreticalCashDzd: 240200,
  actualPhysicalCashCountedDzd: 240200,
  discrepancyDzd: 0,
  totalTimbreAccruedDzd: 1700,
  status: 'balanced',
  notes: 'Arrêté de caisse journalier conforme. Solde en coffre vérifié.',
};

/**
 * Universal React Hook managing persistent state across the 4 Legal/Notary/Accounting personas.
 */
export const useLegalData = () => {
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const currentBusinessId = useAtriumSelector((s) => s.currentBusinessId);
  const currentAccountId = useAtriumSelector((s) => s.account.id);
  const currentStaffId = useAtriumSelector((s) => s.currentUser.id);
  const activeBranchId = currentBranchId || 'branch_legal_main';
  const belongsToActiveBranch = useCallback(
    (item: { branchId?: string; facilityId?: string }) =>
      (item.branchId || item.facilityId || 'branch_legal_main') === activeBranchId,
    [activeBranchId]
  );
  const withBranch = <T extends object>(item: T): T =>
    ({
      ...item,
      accountId: (item as { accountId?: string }).accountId || currentAccountId || 'acc_01',
      businessId: (item as { businessId?: string }).businessId || currentBusinessId || 'biz_legal',
      branchId: (item as { branchId?: string }).branchId || activeBranchId,
      staffId: (item as { staffId?: string }).staffId || currentStaffId || 'staff_01',
    }) as T;

  const [entities, setEntities] = useState<LegalClientEntity[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_entities');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [matters, setMatters] = useState<LegalMatter[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_matters');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [hearings, setHearings] = useState<LegalHearing[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_hearings');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [deadlines, setDeadlines] = useState<CPCADeadline[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_cpca_deadlines');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [notaryDeeds, setNotaryDeeds] = useState<NotaryDeed[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_notary_deeds');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [escrowAccounts, setEscrowAccounts] = useState<EscrowAccount[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_escrow_accounts');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [scfEntries, setScfEntries] = useState<SCFJournalEntry[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_scf_entries');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [cashReceipts, setCashReceipts] = useState<CashReceipt[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_cash_receipts');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [dailyClosure, setDailyClosure] = useState<DailyCashClosure>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_daily_closure');
      return s ? JSON.parse(s) : INITIAL_DAILY_CLOSURE;
    } catch {
      return INITIAL_DAILY_CLOSURE;
    }
  });

  // Local storage auto-sync (idle-deferred)
  useIdlePersist('atrium_legal_entities', entities);
  useIdlePersist('atrium_legal_matters', matters);
  useIdlePersist('atrium_legal_hearings', hearings);
  useIdlePersist('atrium_legal_cpca_deadlines', deadlines);
  useIdlePersist('atrium_legal_notary_deeds', notaryDeeds);
  useIdlePersist('atrium_legal_escrow_accounts', escrowAccounts);
  useIdlePersist('atrium_legal_scf_entries', scfEntries);
  useIdlePersist('atrium_legal_cash_receipts', cashReceipts);
  useIdlePersist('atrium_legal_daily_closure', dailyClosure);

  // Hydrate Legal & Notary workspace from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    void syncCoordinator.runSingleFlight(`legal:${activeBranchId}`, async () => {
      await syncCoordinator.flushQueue().catch(() => {});
      const [
        remoteClients,
        remoteMatters,
        remoteHearings,
        remoteDeadlines,
        remoteDeeds,
        remoteScfEntries,
        remoteReceipts,
      ] = await runWithConcurrency(
        [
          () => legalService.fetchClients(activeBranchId),
          () => legalService.fetchMatters(activeBranchId),
          () => legalService.fetchHearings(activeBranchId),
          () => legalService.fetchCpcaDeadlines(activeBranchId),
          () => legalService.fetchNotaryDeeds(activeBranchId),
          () => legalService.fetchScfEntries(activeBranchId),
          () => legalService.fetchCashReceipts(activeBranchId),
        ],
        4
      );
      if (cancelled) return;
      if (remoteClients.length > 0) setEntities((prev) => mergeLegalById(prev, remoteClients as LegalClientEntity[]));
      if (remoteMatters.length > 0) setMatters((prev) => mergeLegalById(prev, remoteMatters as LegalMatter[]));
      if (remoteHearings.length > 0) setHearings((prev) => mergeLegalById(prev, remoteHearings as LegalHearing[]));
      if (remoteDeadlines.length > 0) setDeadlines((prev) => mergeLegalById(prev, remoteDeadlines as CPCADeadline[]));
      if (remoteDeeds.length > 0) setNotaryDeeds((prev) => mergeLegalById(prev, remoteDeeds as NotaryDeed[]));
      if (remoteScfEntries.length > 0) setScfEntries((prev) => mergeLegalById(prev, remoteScfEntries as SCFJournalEntry[]));
      if (remoteReceipts.length > 0) setCashReceipts((prev) => mergeLegalById(prev, remoteReceipts as CashReceipt[]));
    });

    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const watchedTables = [
      'legal_clients',
      'legal_matters',
      'legal_hearings',
      'legal_deadlines',
      'legal_documents',
      'legal_time_entries',
      'legal_cash_receipts',
    ];

    return realtimeService.subscribeTableChanges(watchedTables, (changedTables, deletedIdsByTable) => {
      const prune = <T extends { id: string }>(table: string, setter: Dispatch<SetStateAction<T[]>>) => {
        const ids = deletedIdsByTable[table];
        if (!ids || ids.length === 0) return;
        const idSet = new Set(ids);
        setter((prev) => prev.filter((item) => !idSet.has(item.id)));
      };

      prune('legal_clients', setEntities);
      prune('legal_matters', setMatters);
      prune('legal_hearings', setHearings);
      prune('legal_deadlines', setDeadlines);
      prune('legal_documents', setNotaryDeeds);
      prune('legal_time_entries', setScfEntries);
      prune('legal_cash_receipts', setCashReceipts);

      const changedSet = new Set(changedTables);
      const tasks: Array<() => Promise<void>> = [];

      if (changedSet.has('legal_clients')) {
        tasks.push(async () => {
          const rows = await legalService.fetchClients(activeBranchId);
          if (!cancelled && rows.length > 0) setEntities((prev) => mergeLegalById(prev, rows as LegalClientEntity[]));
        });
      }
      if (changedSet.has('legal_matters')) {
        tasks.push(async () => {
          const rows = await legalService.fetchMatters(activeBranchId);
          if (!cancelled && rows.length > 0) setMatters((prev) => mergeLegalById(prev, rows as LegalMatter[]));
        });
      }
      if (changedSet.has('legal_hearings')) {
        tasks.push(async () => {
          const rows = await legalService.fetchHearings(activeBranchId);
          if (!cancelled && rows.length > 0) setHearings((prev) => mergeLegalById(prev, rows as LegalHearing[]));
        });
      }
      if (changedSet.has('legal_deadlines')) {
        tasks.push(async () => {
          const rows = await legalService.fetchCpcaDeadlines(activeBranchId);
          if (!cancelled && rows.length > 0) setDeadlines((prev) => mergeLegalById(prev, rows as CPCADeadline[]));
        });
      }
      if (changedSet.has('legal_documents')) {
        tasks.push(async () => {
          const rows = await legalService.fetchNotaryDeeds(activeBranchId);
          if (!cancelled && rows.length > 0) setNotaryDeeds((prev) => mergeLegalById(prev, rows as NotaryDeed[]));
        });
      }
      if (changedSet.has('legal_time_entries')) {
        tasks.push(async () => {
          const rows = await legalService.fetchScfEntries(activeBranchId);
          if (!cancelled && rows.length > 0) setScfEntries((prev) => mergeLegalById(prev, rows as SCFJournalEntry[]));
        });
      }
      if (changedSet.has('legal_cash_receipts')) {
        tasks.push(async () => {
          const rows = await legalService.fetchCashReceipts(activeBranchId);
          if (!cancelled && rows.length > 0) setCashReceipts((prev) => mergeLegalById(prev, rows as CashReceipt[]));
        });
      }

      if (tasks.length > 0) {
        void syncCoordinator.runSingleFlight(
          `legal:rt:${activeBranchId}:${[...changedSet].sort().join(',')}`,
          () => runWithConcurrency(tasks, 4)
        );
      }
    });
  }, [activeBranchId]);

  // Operational action handlers
  const addEntity = (entity: LegalClientEntity) => {
    const scoped = withBranch(entity);
    setEntities((prev) => [scoped, ...prev]);
    void legalService.upsertClient(scoped).catch(() => {});
  };
  const addMatter = (matter: LegalMatter) => {
    const scoped = withBranch(matter);
    setMatters((prev) => [scoped, ...prev]);
    void legalService.upsertMatter(scoped).catch(() => {});
  };
  const updateMatter = (matter: LegalMatter) => {
    const scoped = withBranch(matter);
    setMatters((prev) => prev.map((m) => (m.id === scoped.id ? scoped : m)));
    void legalService.upsertMatter(scoped).catch(() => {});
  };
  const deleteMatter = (id: string) => {
    setMatters((prev) => prev.filter((m) => m.id !== id));
    void legalService.deleteMatter(id, currentStaffId).catch(() => {});
  };

  const addHearing = (hearing: LegalHearing) => {
    const scoped = withBranch(hearing);
    setHearings((prev) => [scoped, ...prev]);
    void legalService.upsertHearing(scoped).catch(() => {});
  };
  const updateHearing = (hearing: LegalHearing) => {
    const scoped = withBranch(hearing);
    setHearings((prev) => prev.map((h) => (h.id === scoped.id ? scoped : h)));
    void legalService.upsertHearing(scoped).catch(() => {});
  };
  const deleteHearing = (id: string) => {
    setHearings((prev) => prev.filter((h) => h.id !== id));
    void syncCoordinator.softDeleteRow('legal_hearings', id, currentStaffId).catch(() => {});
  };

  const addCPCADeadline = (dl: CPCADeadline) => {
    const scoped = withBranch(dl);
    setDeadlines((prev) => [scoped, ...prev]);
    void legalService.upsertCpcaDeadline(scoped).catch(() => {});
  };
  const updateCPCADeadline = (dl: CPCADeadline) => {
    const scoped = withBranch(dl);
    setDeadlines((prev) => prev.map((d) => (d.id === scoped.id ? scoped : d)));
    void legalService.upsertCpcaDeadline(scoped).catch(() => {});
  };

  const addNotaryDeed = (deed: NotaryDeed) => {
    const scoped = withBranch(deed);
    setNotaryDeeds((prev) => [scoped, ...prev]);
    void legalService.upsertNotaryDeed(scoped, matters[0]?.id).catch(() => {});
  };
  const updateNotaryDeed = (deed: NotaryDeed) => {
    const scoped = withBranch(deed);
    setNotaryDeeds((prev) => prev.map((d) => (d.id === scoped.id ? scoped : d)));
    void legalService.upsertNotaryDeed(scoped, matters[0]?.id).catch(() => {});
  };

  const updateEscrowAccount = (acc: EscrowAccount) => {
    const scoped = withBranch(acc);
    const prevAcc = escrowAccounts.find((a) => a.id === scoped.id);
    setEscrowAccounts((prev) => prev.map((a) => (a.id === scoped.id ? scoped : a)));
    void legalService.upsertEscrowSnapshot(scoped).catch(() => {});
    if (scoped.transactions.length > (prevAcc?.transactions.length ?? 0)) {
      const existingIds = new Set((prevAcc?.transactions || []).map((t) => t.id));
      const newTxs = scoped.transactions.filter((t) => !existingIds.has(t.id));
      newTxs.forEach((tx) => {
        void legalService
          .recordEscrowMovement({
            clientId: scoped.clientName || scoped.id,
            matterId: scoped.matterId,
            movementType: tx.type === 'deposit_received' ? 'deposit' : 'withdrawal',
            amountDzd: tx.amountDzd,
            reference: tx.bankReference || tx.id,
            notes: tx.notes,
          })
          .catch(() => {});
      });
    }
  };

  const addSCFEntry = (entry: SCFJournalEntry) => {
    const scoped = withBranch(entry);
    setScfEntries((prev) => [scoped, ...prev]);
    void legalService.upsertScfEntry(scoped, matters[0]?.id).catch(() => {});
  };

  const addCashReceipt = (rc: CashReceipt) => {
    const scopedRc = withBranch(rc);
    setCashReceipts((prev) => [scopedRc, ...prev]);
    void legalService.upsertCashReceipt(scopedRc).catch(() => {});
    // update daily closure
    setDailyClosure((prev) => ({
      ...prev,
      totalCashReceivedDzd: (prev.totalCashReceivedDzd || 0) + scopedRc.netCollectedDzd,
      theoreticalCashDzd: (prev.theoreticalCashDzd || 0) + scopedRc.netCollectedDzd,
      totalTimbreAccruedDzd: (prev.totalTimbreAccruedDzd || 0) + scopedRc.timbreFiscalDzd,
      actualPhysicalCashCountedDzd: (prev.actualPhysicalCashCountedDzd || 0) + scopedRc.netCollectedDzd,
    }));
  };

  const updateDailyClosure = (cl: DailyCashClosure) => setDailyClosure(withBranch(cl));

  const resetLegalMockData = () => {
    setEntities((prev) => prev.filter((e) => !belongsToActiveBranch(e)));
    setMatters((prev) => prev.filter((m) => !belongsToActiveBranch(m)));
    setHearings((prev) => prev.filter((h) => !belongsToActiveBranch(h)));
    setDeadlines((prev) => prev.filter((d) => !belongsToActiveBranch(d)));
    setNotaryDeeds((prev) => prev.filter((n) => !belongsToActiveBranch(n)));
    setEscrowAccounts((prev) => prev.filter((a) => !belongsToActiveBranch(a)));
    setScfEntries((prev) => prev.filter((s) => !belongsToActiveBranch(s)));
    setCashReceipts((prev) => prev.filter((c) => !belongsToActiveBranch(c)));
    if (activeBranchId === 'branch_legal_main') {
      setDailyClosure(INITIAL_DAILY_CLOSURE);
    }
  };

  const scopedEntities = useMemo(() => entities.filter(belongsToActiveBranch), [entities, belongsToActiveBranch]);
  const scopedMatters = useMemo(() => matters.filter(belongsToActiveBranch), [matters, belongsToActiveBranch]);
  const scopedHearings = useMemo(() => hearings.filter(belongsToActiveBranch), [hearings, belongsToActiveBranch]);
  const scopedDeadlines = useMemo(() => deadlines.filter(belongsToActiveBranch), [deadlines, belongsToActiveBranch]);
  const scopedNotaryDeeds = useMemo(() => notaryDeeds.filter(belongsToActiveBranch), [notaryDeeds, belongsToActiveBranch]);
  const scopedEscrowAccounts = useMemo(() => escrowAccounts.filter(belongsToActiveBranch), [escrowAccounts, belongsToActiveBranch]);
  const scopedScfEntries = useMemo(() => scfEntries.filter(belongsToActiveBranch), [scfEntries, belongsToActiveBranch]);
  const scopedCashReceipts = useMemo(() => cashReceipts.filter(belongsToActiveBranch), [cashReceipts, belongsToActiveBranch]);

  return {
    entities: scopedEntities,
    matters: scopedMatters,
    hearings: scopedHearings,
    deadlines: scopedDeadlines,
    notaryDeeds: scopedNotaryDeeds,
    escrowAccounts: scopedEscrowAccounts,
    scfEntries: scopedScfEntries,
    cashReceipts: scopedCashReceipts,
    dailyClosure,
    addEntity,
    addMatter,
    updateMatter,
    deleteMatter,
    addHearing,
    updateHearing,
    deleteHearing,
    addCPCADeadline,
    updateCPCADeadline,
    addNotaryDeed,
    updateNotaryDeed,
    updateEscrowAccount,
    addSCFEntry,
    addCashReceipt,
    updateDailyClosure,
    resetLegalMockData,
  };
};
