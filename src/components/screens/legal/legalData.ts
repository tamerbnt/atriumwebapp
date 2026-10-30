import { useState, useEffect } from 'react';
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
  const [entities, setEntities] = useState<LegalClientEntity[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_entities');
      return s ? JSON.parse(s) : INITIAL_LEGAL_ENTITIES;
    } catch {
      return INITIAL_LEGAL_ENTITIES;
    }
  });

  const [matters, setMatters] = useState<LegalMatter[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_matters');
      return s ? JSON.parse(s) : INITIAL_MATTERS;
    } catch {
      return INITIAL_MATTERS;
    }
  });

  const [hearings, setHearings] = useState<LegalHearing[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_hearings');
      return s ? JSON.parse(s) : INITIAL_HEARINGS;
    } catch {
      return INITIAL_HEARINGS;
    }
  });

  const [deadlines, setDeadlines] = useState<CPCADeadline[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_cpca_deadlines');
      return s ? JSON.parse(s) : INITIAL_CPCA_DEADLINES;
    } catch {
      return INITIAL_CPCA_DEADLINES;
    }
  });

  const [notaryDeeds, setNotaryDeeds] = useState<NotaryDeed[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_notary_deeds');
      return s ? JSON.parse(s) : INITIAL_NOTARY_DEEDS;
    } catch {
      return INITIAL_NOTARY_DEEDS;
    }
  });

  const [escrowAccounts, setEscrowAccounts] = useState<EscrowAccount[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_escrow_accounts');
      return s ? JSON.parse(s) : INITIAL_ESCROW_ACCOUNTS;
    } catch {
      return INITIAL_ESCROW_ACCOUNTS;
    }
  });

  const [scfEntries, setScfEntries] = useState<SCFJournalEntry[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_scf_entries');
      return s ? JSON.parse(s) : INITIAL_SCF_ENTRIES;
    } catch {
      return INITIAL_SCF_ENTRIES;
    }
  });

  const [cashReceipts, setCashReceipts] = useState<CashReceipt[]>(() => {
    try {
      const s = localStorage.getItem('atrium_legal_cash_receipts');
      return s ? JSON.parse(s) : INITIAL_CASH_RECEIPTS;
    } catch {
      return INITIAL_CASH_RECEIPTS;
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

  // Local storage auto-sync
  useEffect(() => {
    try {
      localStorage.setItem('atrium_legal_entities', JSON.stringify(entities));
      localStorage.setItem('atrium_legal_matters', JSON.stringify(matters));
      localStorage.setItem('atrium_legal_hearings', JSON.stringify(hearings));
      localStorage.setItem('atrium_legal_cpca_deadlines', JSON.stringify(deadlines));
      localStorage.setItem('atrium_legal_notary_deeds', JSON.stringify(notaryDeeds));
      localStorage.setItem('atrium_legal_escrow_accounts', JSON.stringify(escrowAccounts));
      localStorage.setItem('atrium_legal_scf_entries', JSON.stringify(scfEntries));
      localStorage.setItem('atrium_legal_cash_receipts', JSON.stringify(cashReceipts));
      localStorage.setItem('atrium_legal_daily_closure', JSON.stringify(dailyClosure));
    } catch {}
  }, [entities, matters, hearings, deadlines, notaryDeeds, escrowAccounts, scfEntries, cashReceipts, dailyClosure]);

  // Operational action handlers
  const addEntity = (entity: LegalClientEntity) => setEntities((prev) => [entity, ...prev]);
  const addMatter = (matter: LegalMatter) => setMatters((prev) => [matter, ...prev]);
  const updateMatter = (matter: LegalMatter) => setMatters((prev) => prev.map((m) => (m.id === matter.id ? matter : m)));
  const deleteMatter = (id: string) => setMatters((prev) => prev.filter((m) => m.id !== id));

  const addHearing = (hearing: LegalHearing) => setHearings((prev) => [hearing, ...prev]);
  const updateHearing = (hearing: LegalHearing) => setHearings((prev) => prev.map((h) => (h.id === hearing.id ? hearing : h)));
  const deleteHearing = (id: string) => setHearings((prev) => prev.filter((h) => h.id !== id));

  const addCPCADeadline = (dl: CPCADeadline) => setDeadlines((prev) => [dl, ...prev]);
  const updateCPCADeadline = (dl: CPCADeadline) => setDeadlines((prev) => prev.map((d) => (d.id === dl.id ? dl : d)));

  const addNotaryDeed = (deed: NotaryDeed) => setNotaryDeeds((prev) => [deed, ...prev]);
  const updateNotaryDeed = (deed: NotaryDeed) => setNotaryDeeds((prev) => prev.map((d) => (d.id === deed.id ? deed : d)));

  const updateEscrowAccount = (acc: EscrowAccount) => setEscrowAccounts((prev) => prev.map((a) => (a.id === acc.id ? acc : a)));

  const addSCFEntry = (entry: SCFJournalEntry) => setScfEntries((prev) => [entry, ...prev]);

  const addCashReceipt = (rc: CashReceipt) => {
    setCashReceipts((prev) => [rc, ...prev]);
    // update daily closure
    setDailyClosure((prev) => ({
      ...prev,
      totalCashReceivedDzd: (prev.totalCashReceivedDzd || 0) + rc.netCollectedDzd,
      theoreticalCashDzd: (prev.theoreticalCashDzd || 0) + rc.netCollectedDzd,
      totalTimbreAccruedDzd: (prev.totalTimbreAccruedDzd || 0) + rc.timbreFiscalDzd,
      actualPhysicalCashCountedDzd: (prev.actualPhysicalCashCountedDzd || 0) + rc.netCollectedDzd,
    }));
  };

  const updateDailyClosure = (cl: DailyCashClosure) => setDailyClosure(cl);

  const resetLegalMockData = () => {
    setEntities(INITIAL_LEGAL_ENTITIES);
    setMatters(INITIAL_MATTERS);
    setHearings(INITIAL_HEARINGS);
    setDeadlines(INITIAL_CPCA_DEADLINES);
    setNotaryDeeds(INITIAL_NOTARY_DEEDS);
    setEscrowAccounts(INITIAL_ESCROW_ACCOUNTS);
    setScfEntries(INITIAL_SCF_ENTRIES);
    setCashReceipts(INITIAL_CASH_RECEIPTS);
    setDailyClosure(INITIAL_DAILY_CLOSURE);
  };

  return {
    entities,
    matters,
    hearings,
    deadlines,
    notaryDeeds,
    escrowAccounts,
    scfEntries,
    cashReceipts,
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
