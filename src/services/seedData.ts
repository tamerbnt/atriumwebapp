import {
  Account,
  Appointment,
  Business,
  Branch,
  Device,
  Member,
  MembershipPlan,
  Product,
  RegistrationLead,
  Sale,
  ScheduleEvent,
  ServiceItem,
  StaffMember,
  SubscriptionPlan,
  FreelanceClient,
  FreelanceProject,
  TimeLogEntry,
  FreelanceInvoice,
  FreelanceProposal,
  FreelanceExpense,
  ActiveTimerState,
  ParkedOrder,
  StockMovement,
  ReceiptConfig,
  RentableUnit,
  RentalBooking,
  RentalRenter,
  SecurityDepositRecord,
  EduCourse,
  EduClassroom,
  EduCohort,
  EduStudent,
  EduEnrollment,
  EduSession,
  EduAttendance,
  EduGrade,
  EduCertificate,
  EduAdmissionLead,
  SalonWorkstation,
  StylistPayout,
  B2bClient,
  B2bSupplier,
  WarehouseDepot,
  CommercialDocument,
  PurchaseDocument,
  StockMovementVoucher,
} from '../types/index';

import type {
  PMClient,
  PMProject,
  PMMilestone,
  PMCollateralItem,
  PMPrintOrder,
  PMBatDeliverable,
  PMTalent,
  PMMission,
  PMAttendance,
  PMExpense,
  PMPayrollBatch,
  PMCcpSlip,
  PMEquipmentStock,
} from '../types/index';

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_free_web',
    name: 'Free Web',
    tierRank: 0,
    maxBusinesses: 1,
    maxBranches: 1,
    maxDevices: 1,
    maxStaff: 5,
    crossBranchReports: false,
    sharedMembers: false,
    isFreeTier: true,
    trialDays: 0,
    priceLabel: 'Free Forever',
  },
  {
    id: 'plan_starter',
    name: 'Starter',
    tierRank: 1,
    maxBusinesses: 1,
    maxBranches: 2,
    maxDevices: 2,
    maxStaff: 10,
    crossBranchReports: false,
    sharedMembers: false,
    isFreeTier: false,
    trialDays: 0,
    priceLabel: 'Starter Lifetime',
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    tierRank: 2,
    maxBusinesses: 3,
    maxBranches: 5,
    maxDevices: 5,
    maxStaff: 999,
    crossBranchReports: true,
    sharedMembers: false,
    isFreeTier: false,
    trialDays: 0,
    priceLabel: 'Pro Lifetime',
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    tierRank: 3,
    maxBusinesses: 999,
    maxBranches: 999,
    maxDevices: 999,
    maxStaff: 999,
    crossBranchReports: true,
    sharedMembers: true,
    isFreeTier: false,
    trialDays: 0,
    priceLabel: 'Enterprise Perpetual',
  },
];

export const INITIAL_ACCOUNT: Account = {
  id: 'acc_01',
  fullName: 'Amine Bentouati',
  email: 'bentouatitamer@gmail.com',
  phone: '+213 550 12 34 56',
  isActive: true,
  createdAt: '2026-01-15T09:00:00Z',
};

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz_gym',
    accountId: 'acc_01',
    category: 'membership_session',
    name: 'Atrium 1',
    displayName: 'Atrium 1 Performance Facility',
    address: '14 Boulevard Zighout Youcef, Algiers',
    phone: '+213 21 73 45 67',
    isActive: true,
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'biz_salon',
    accountId: 'acc_01',
    category: 'appointment_service',
    name: 'Luxe Beauty Lounge & Spa',
    displayName: 'Luxe Aesthetics Hydra',
    address: '22 Rue Djenane El Malik, Hydra',
    phone: '+213 23 48 90 12',
    isActive: true,
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'biz_restaurant',
    accountId: 'acc_01',
    category: 'pos_inventory',
    name: 'Artis Commerce & Point of Sale',
    displayName: 'Artis Retail & POS Store',
    address: '8 Rue Didouche Mourad, Algiers',
    phone: '+213 21 64 32 10',
    isActive: true,
    createdAt: '2026-03-01T11:00:00Z',
  },
  {
    id: 'biz_agency',
    accountId: 'acc_01',
    category: 'project_milestone',
    name: 'NCH Market Activator',
    displayName: 'NCH Market Activator',
    address: 'Bab Ezzouar Cyberpark, Tower B, Alger',
    phone: '+213 23 92 11 00',
    isActive: true,
    createdAt: '2026-03-15T08:00:00Z',
  },
  {
    id: 'biz_freelance',
    accountId: 'acc_01',
    category: 'freelance_solo',
    name: 'Atlas Independent Studio',
    displayName: 'Atlas Studio · Design, Code & Advisory',
    address: 'Cloud Workspace / Remote',
    phone: '+213 550 99 88 77',
    isActive: true,
    createdAt: '2026-04-01T09:00:00Z',
  },
  {
    id: 'biz_venue',
    accountId: 'acc_01',
    category: 'rental_booking',
    name: 'Palais des Événements & Studios',
    displayName: 'Palais Algiers · Venues, Studios & Cowork',
    address: '5 Chemin Doudou Mokhtar, Ben Aknoun, Algiers',
    phone: '+213 23 38 12 40',
    isActive: true,
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'biz_education',
    accountId: 'acc_01',
    category: 'education_cohort',
    name: 'Atlas Academy & Tutoring Institute',
    displayName: 'Atlas Academy · Languages, Code & Exam Prep',
    address: '18 Rue Ahmed Ouaked, Dely Ibrahim, Algiers',
    phone: '+213 23 35 88 90',
    isActive: true,
    createdAt: '2026-04-15T10:00:00Z',
  },
  {
    id: 'biz_trading',
    accountId: 'acc_01',
    category: 'trading_commercial',
    name: 'Maghreb Négoce & Distribution',
    displayName: 'Maghreb Négoce · Import, Gros & Demi-Gros',
    address: 'Zone Industrielle Oued Smar, Lot 42, Alger',
    phone: '+213 23 93 40 10',
    isActive: true,
    createdAt: '2026-04-20T08:00:00Z',
  },
  {
    id: 'biz_medical',
    accountId: 'acc_01',
    category: 'medical_clinic',
    name: 'Centre Médical & Polyclinique Atrium',
    displayName: 'Polyclinique Atrium · Consultations & Soins',
    address: '12 Boulevard des Martyrs, Alger Centre',
    phone: '+213 21 71 88 00',
    isActive: true,
    createdAt: '2026-05-01T08:00:00Z',
  },
  {
    id: 'biz_garage',
    accountId: 'acc_01',
    category: 'auto_garage',
    name: 'Garage & Centre Automobile Pro',
    displayName: 'Garage Pro · Mécanique, Scanner & Carrosserie',
    address: "Zone d'Activité Dar El Beïda, Alger",
    phone: '+213 23 83 15 20',
    isActive: true,
    createdAt: '2026-05-05T08:00:00Z',
  },
  {
    id: 'biz_realestate',
    accountId: 'acc_01',
    category: 'real_estate',
    name: 'Agence Immobilière Al-Manar',
    displayName: 'Al-Manar Immobilier · Vente, Location & Gestion',
    address: '34 Rue Didouche Mourad, Alger',
    phone: '+213 21 63 90 40',
    isActive: true,
    createdAt: '2026-05-10T08:00:00Z',
  },
  {
    id: 'biz_manufacturing',
    accountId: 'acc_01',
    category: 'manufacturing_production',
    name: 'Ateliers de Production & Fabrication PME',
    displayName: 'Ateliers Rouïba · Usinage, Tôlerie & Assemblage',
    address: 'Zone Industrielle Rouïba, Alger',
    phone: '+213 23 85 44 10',
    isActive: true,
    createdAt: '2026-05-15T08:00:00Z',
  },
  {
    id: 'biz_legal',
    accountId: 'acc_01',
    category: 'legal_accounting',
    name: 'Cabinet Juridique & Étude Notariale',
    displayName: 'Cabinet Mohamed V · Avocats & Notaires Associés',
    address: '18 Boulevard Mohamed V, Alger',
    phone: '+213 21 74 33 22',
    isActive: true,
    createdAt: '2026-05-20T08:00:00Z',
  },
  {
    id: 'biz_logistics',
    accountId: 'acc_01',
    category: 'logistics_delivery',
    name: 'Atlas Express Messagerie & Livraison COD',
    displayName: 'Atlas Express · Transport National & Dernier Kilomètre',
    address: 'Hub Logistique Aéroport Houari Boumediene, Alger',
    phone: '+213 23 98 00 11',
    isActive: true,
    createdAt: '2026-05-25T08:00:00Z',
  },
  {
    id: 'biz_contractor',
    accountId: 'acc_01',
    category: 'construction_contractor',
    name: 'Entreprise Générale de Bâtiment & Travaux Publics',
    displayName: 'Atlas BTP & Génie Civil · Chantiers & Ouvrages',
    address: "Zone d'Activité Chéraga, Alger",
    phone: '+213 23 36 70 88',
    isActive: true,
    createdAt: '2026-06-01T08:00:00Z',
  },
  {
    id: 'biz_agri',
    accountId: 'acc_01',
    category: 'agriculture_farming',
    name: 'Domaine Agricole & Élevage de la Mitidja',
    displayName: 'Domaine Mitidja · Maraîchage, Arboriculture & Lait',
    address: 'Route Nationale 1, Boufarik, Blida',
    phone: '+213 25 47 12 00',
    isActive: true,
    createdAt: '2026-06-05T08:00:00Z',
  },
];

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'branch_gym_main',
    accountId: 'acc_01',
    businessId: 'biz_gym',
    name: 'Atrium 1',
    code: 'ATR-01',
    address: '14 Bd Zighout Youcef, Algiers',
    phone: '+213 21 73 45 67',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'branch_gym_west',
    accountId: 'acc_01',
    businessId: 'biz_gym',
    name: 'Apex Club Sidi Yahia',
    code: 'APX-SDY',
    address: 'Centre Commercial Sidi Yahia, Algiers',
    phone: '+213 21 48 11 22',
    isMainBranch: false,
    isActive: true,
    createdAt: '2026-02-10T09:30:00Z',
  },
  {
    id: 'branch_salon_hydra',
    accountId: 'acc_01',
    businessId: 'biz_salon',
    name: 'Luxe Spa Hydra',
    code: 'LX-HYD',
    address: '22 Rue Djenane El Malik, Hydra',
    phone: '+213 23 48 90 12',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'branch_rest_didouche',
    accountId: 'acc_01',
    businessId: 'biz_restaurant',
    name: 'Artis Flagship Store',
    code: 'POS-01',
    address: '8 Rue Didouche Mourad, Algiers',
    phone: '+213 21 64 32 10',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-03-01T11:00:00Z',
  },
  {
    id: 'branch_agency_main',
    accountId: 'acc_01',
    businessId: 'biz_agency',
    name: 'NCH Market Activator Algiers HQ',
    code: 'NCH-01',
    address: 'Bab Ezzouar Cyberpark, Tower B, Algiers',
    phone: '+213 23 92 11 00',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-03-15T08:00:00Z',
  },
  {
    id: 'branch_freelance_main',
    accountId: 'acc_01',
    businessId: 'biz_freelance',
    name: 'Primary Studio & Cloud Terminal',
    code: 'SOLO-01',
    address: 'Remote Workspace',
    phone: '+213 550 99 88 77',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-04-01T09:00:00Z',
  },
  {
    id: 'branch_venue_main',
    accountId: 'acc_01',
    businessId: 'biz_venue',
    name: 'Palais Central Complex',
    code: 'VEN-01',
    address: '5 Chemin Doudou Mokhtar, Ben Aknoun',
    phone: '+213 23 38 12 40',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'branch_edu_main',
    accountId: 'acc_01',
    businessId: 'biz_education',
    name: 'Atlas Campus Dely Ibrahim',
    code: 'EDU-01',
    address: '18 Rue Ahmed Ouaked, Dely Ibrahim',
    phone: '+213 23 35 88 90',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-04-15T10:00:00Z',
  },
  {
    id: 'branch_trading_main',
    accountId: 'acc_01',
    businessId: 'biz_trading',
    name: 'Dépôt Central Oued Smar',
    code: 'DEP-01',
    address: 'Zone Industrielle Oued Smar, Lot 42, Alger',
    phone: '+213 23 93 40 10',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-04-20T08:00:00Z',
  },
  {
    id: 'branch_trading_oran',
    accountId: 'acc_01',
    businessId: 'biz_trading',
    name: 'Dépôt Régional Oran Es Sénia',
    code: 'DEP-02',
    address: 'Zone Logistique Es Sénia, Oran',
    phone: '+213 41 51 22 30',
    isMainBranch: false,
    isActive: true,
    createdAt: '2026-04-20T08:00:00Z',
  },
  {
    id: 'branch_medical_main',
    accountId: 'acc_01',
    businessId: 'biz_medical',
    name: 'Cabinet Principal Alger Centre',
    code: 'MED-01',
    address: '12 Boulevard des Martyrs, Alger Centre',
    phone: '+213 21 71 88 00',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-05-01T08:00:00Z',
  },
  {
    id: 'branch_garage_main',
    accountId: 'acc_01',
    businessId: 'biz_garage',
    name: 'Atelier Central Dar El Beïda',
    code: 'GAR-01',
    address: "Zone d'Activité Dar El Beïda, Alger",
    phone: '+213 23 83 15 20',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-05-05T08:00:00Z',
  },
  {
    id: 'branch_realestate_main',
    accountId: 'acc_01',
    businessId: 'biz_realestate',
    name: 'Agence Centrale Alger',
    code: 'IMM-01',
    address: '34 Rue Didouche Mourad, Alger',
    phone: '+213 21 63 90 40',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-05-10T08:00:00Z',
  },
  {
    id: 'branch_manufacturing_main',
    accountId: 'acc_01',
    businessId: 'biz_manufacturing',
    name: 'Usine & Ateliers Rouïba',
    code: 'MFG-01',
    address: 'Zone Industrielle Rouïba, Alger',
    phone: '+213 23 85 44 10',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-05-15T08:00:00Z',
  },
  {
    id: 'branch_legal_main',
    accountId: 'acc_01',
    businessId: 'biz_legal',
    name: 'Cabinet Principal Mohamed V',
    code: 'LEG-01',
    address: '18 Boulevard Mohamed V, Alger',
    phone: '+213 21 74 33 22',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-05-20T08:00:00Z',
  },
  {
    id: 'branch_logistics_main',
    accountId: 'acc_01',
    businessId: 'biz_logistics',
    name: 'Hub Central Aéroport Alger',
    code: 'LOG-01',
    address: 'Hub Logistique Aéroport Houari Boumediene, Alger',
    phone: '+213 23 98 00 11',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-05-25T08:00:00Z',
  },
  {
    id: 'branch_contractor_main',
    accountId: 'acc_01',
    businessId: 'biz_contractor',
    name: 'Direction Projets Chéraga',
    code: 'BTP-01',
    address: "Zone d'Activité Chéraga, Alger",
    phone: '+213 23 36 70 88',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-06-01T08:00:00Z',
  },
  {
    id: 'branch_agri_main',
    accountId: 'acc_01',
    businessId: 'biz_agri',
    name: 'Ferme Centrale Boufarik',
    code: 'AGR-01',
    address: 'Route Nationale 1, Boufarik, Blida',
    phone: '+213 25 47 12 00',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-06-05T08:00:00Z',
  },
];

export const INITIAL_DEVICES: Device[] = [
  {
    id: 'dev_01',
    accountId: 'acc_01',
    branchId: 'branch_gym_main',
    hardwareId: 'HW-DESK-ALGIERS-01',
    label: 'Front Desk Main Terminal',
    isActive: true,
    lastSeenAt: '2026-01-15T10:00:00Z',
    registeredAt: '2026-01-15T10:00:00Z',
  },
];

export const INITIAL_PLANS_BY_BRANCH: Record<string, MembershipPlan[]> = {
  branch_gym_main: [],
  branch_salon_hydra: [],
  branch_rest_didouche: [],
};

export const INITIAL_MEMBERS: Member[] = [];
export const INITIAL_LEADS: RegistrationLead[] = [];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'stf_01',
    tenantId: 'acc_01',
    facilityId: 'branch_gym_main',
    fullName: 'Amine Bentouati',
    email: 'bentouatitamer@gmail.com',
    phoneNumber: '+213 550 12 34 56',
    role: 'Owner',
    roleRank: 8,
    isActive: true,
    hireDate: '2025-01-01',
    salary: 250000,
    paymentDay: 28,
    pinCode: '1234',
    cardId: 'STF-OWNER-01',
    allowedModules: ['all'],
  },
];

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_SCHEDULE: ScheduleEvent[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_PARKED_ORDERS: ParkedOrder[] = [
  {
    id: 'po_01',
    accountId: 'acc_01',
    businessId: 'biz_01',
    branchId: 'branch_gym_main',
    staffId: 'stf_01',
    tenantId: 'acc_01',
    facilityId: 'branch_gym_main',
    referenceName: 'Commande En Attente #1',
    items: [],
    discount: 0,
    subtotal: 0,
    totalAmount: 0,
    createdAt: '2026-01-15T10:00:00Z',
  },
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'sm_01',
    accountId: 'acc_01',
    businessId: 'biz_01',
    branchId: 'branch_gym_main',
    staffId: 'stf_01',
    tenantId: 'acc_01',
    facilityId: 'branch_gym_main',
    productId: 'prod_01',
    productName: 'Mouvement Stock Initial',
    type: 'Initial',
    quantity: 10,
    previousStock: 0,
    newStock: 10,
    createdAt: '2026-01-15T10:00:00Z',
  },
];

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  headerTitle: 'ATRIUM POS RETAIL',
  subHeader: 'General Merchandise & Fine Goods',
  address: '8 Rue Didouche Mourad, Alger Centre',
  phone: '+213 21 64 32 10',
  taxId: 'NIF: 001916010098412 · RC: 16/00-098231',
  footerMessage: 'Merci pour votre visite ! / شكراً لزيارتكم',
  showTaxBreakdown: true,
  showCashier: true,
  showBarcode: true,
};

export const INITIAL_SALON_SERVICES: ServiceItem[] = [];
export const INITIAL_SALON_WORKSTATIONS: SalonWorkstation[] = [];
export const INITIAL_STYLIST_PAYOUTS: StylistPayout[] = [];
export const INITIAL_SALON_CLIENTS: Member[] = [];
export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_FREELANCE_CLIENTS: FreelanceClient[] = [];
export const INITIAL_FREELANCE_PROJECTS: FreelanceProject[] = [];
export const INITIAL_TIME_LOGS: TimeLogEntry[] = [];
export const INITIAL_FREELANCE_INVOICES: FreelanceInvoice[] = [];
export const INITIAL_FREELANCE_PROPOSALS: FreelanceProposal[] = [];
export const INITIAL_FREELANCE_EXPENSES: FreelanceExpense[] = [];
export const INITIAL_ACTIVE_TIMER: ActiveTimerState = {
  isRunning: false,
  isPaused: false,
  clientId: '',
  clientName: '',
  projectId: '',
  projectTitle: '',
  deliverableId: undefined,
  deliverableTitle: undefined,
  taskDescription: '',
  elapsedSeconds: 0,
  isBillable: true,
  isPomodoro: false,
  pomodoroRemainingSeconds: 1500,
  pomodoroMode: 'work',
  startedAt: null,
};

export const getVenueDateStr = (dayOffset: number, timeStr = '10:00:00Z'): string => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const dateStr = d.toISOString().split('T')[0];
  return `${dateStr}T${timeStr}`;
};

export const INITIAL_RENTABLE_UNITS: RentableUnit[] = [];
export const INITIAL_RENTAL_RENTERS: RentalRenter[] = [];
export const createInitialRentalBookings = (): RentalBooking[] => [];
export const INITIAL_RENTAL_BOOKINGS: RentalBooking[] = [];
export const createInitialSecurityDeposits = (): SecurityDepositRecord[] => [];
export const INITIAL_SECURITY_DEPOSITS: SecurityDepositRecord[] = [];

export const INITIAL_EDU_COURSES: EduCourse[] = [];
export const INITIAL_EDU_CLASSROOMS: EduClassroom[] = [];
export const INITIAL_EDU_COHORTS: EduCohort[] = [];
export const INITIAL_EDU_STUDENTS: EduStudent[] = [];
export const INITIAL_EDU_ENROLLMENTS: EduEnrollment[] = [];
export const INITIAL_EDU_SESSIONS: EduSession[] = [];
export const INITIAL_EDU_ATTENDANCE: EduAttendance[] = [];
export const INITIAL_EDU_GRADES: EduGrade[] = [];
export const INITIAL_EDU_CERTIFICATES: EduCertificate[] = [];
export const INITIAL_EDU_ADMISSIONS: EduAdmissionLead[] = [];

export const INITIAL_PM_CLIENTS: PMClient[] = [];
export const INITIAL_PM_PROJECTS: PMProject[] = [];
export const INITIAL_PM_MILESTONES: PMMilestone[] = [];
export const INITIAL_PM_COLLATERAL_CATALOG: PMCollateralItem[] = [];
export const INITIAL_PM_PRINT_ORDERS: PMPrintOrder[] = [];
export const INITIAL_PM_BAT_DELIVERABLES: PMBatDeliverable[] = [];
export const INITIAL_PM_TALENTS: PMTalent[] = [];
export const INITIAL_PM_MISSIONS: PMMission[] = [];
export const INITIAL_PM_ATTENDANCES: PMAttendance[] = [];
export const INITIAL_PM_EXPENSES: PMExpense[] = [];
export const INITIAL_PM_PAYROLL_BATCHES: PMPayrollBatch[] = [];
export const INITIAL_PM_CCP_SLIPS: PMCcpSlip[] = [];
export const INITIAL_PM_EQUIPMENT_STOCK: PMEquipmentStock[] = [];

export const INITIAL_WAREHOUSES: WarehouseDepot[] = [];
export const INITIAL_B2B_CLIENTS: B2bClient[] = [];
export const INITIAL_B2B_SUPPLIERS: B2bSupplier[] = [];
export const INITIAL_COMMERCIAL_DOCS: CommercialDocument[] = [];
export const INITIAL_PURCHASE_DOCS: PurchaseDocument[] = [];
export const INITIAL_STOCK_VOUCHERS: StockMovementVoucher[] = [];
export const INITIAL_TRADING_PRODUCTS: Product[] = [];
