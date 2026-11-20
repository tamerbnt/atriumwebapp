import { formatMoney } from '../../../utils/rules';
import type {
  CurrencyCode,
  Member,
  RegistrationLead,
  Sale,
  ScheduleEvent,
  MemberCheckInLog,
  Appointment,
  Product,
  ParkedOrder,
  EduSession,
  EduAdmissionLead,
  EduEnrollment,
  PMProject,
  PMPrintOrder,
  PMBatDeliverable,
  PMMission,
  PMAttendance,
  PMExpense,
  PMPayrollBatch,
  RentalBooking,
  SecurityDepositRecord,
  FreelanceProject,
  TimeLogEntry,
  FreelanceInvoice,
  FreelanceProposal,
  CommercialDocument,
  PurchaseDocument,
  WarehouseDepot,
  MedicalConsultation,
  MedicalAppointmentSlot,
  MedicalPrescription,
  ChifaClaimRecord,
  RealEstateMandate,
  RealEstateInspection,
  BonDeVisiteRecord,
  RentalQuittanceRecord,
  ManufacturingOrder,
  QualityInspectionRecord,
  RawMaterialStockItem,
  LegalMatter,
  LegalHearing,
  CPCADeadline,
  NotaryDeed,
  SCFJournalEntry,
  CashReceipt,
  LogisticsShipment,
  LogisticsManifest,
  TransportBag,
  MerchantRemittanceBatch,
  ContractorDailyLog,
  ContractorDgp,
  ContractorServiceOrder,
  ConcretePourRecord,
  AgriDailyPointage,
  AgriMilkingRecord,
  AgriWeighbridgeTicket,
  AgriCropCycle,
  SupportedLanguage,
} from '../../../types/index';
import type {
  RepairOrder,
  GarageInvoice,
  SparePart,
} from '../garage/garageData';
import type {
  HomeDailyEvent,
  HomeHistoriqueFilterOption,
} from '../../common/home';
import { l3 } from '../../common/home';

export interface HomeHistoriqueBundle {
  events: HomeDailyEvent[];
  filters: HomeHistoriqueFilterOption[];
}

function hhmm(isoOrTime?: string): string {
  if (!isoOrTime) return '—';
  const match = isoOrTime.match(/\b(\d{2}:\d{2})\b/);
  if (match) return match[1];
  if (isoOrTime.length >= 16 && isoOrTime[10] === 'T') {
    return isoOrTime.slice(11, 16);
  }
  return isoOrTime.slice(0, 10);
}

function sortRecent(events: HomeDailyEvent[]): HomeDailyEvent[] {
  return [...events].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

export function buildMembershipHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  role: string;
  checkIns: MemberCheckInLog[];
  leads: RegistrationLead[];
  sales: Sale[];
  schedule: ScheduleEvent[];
  members: Member[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, role, checkIns, leads, sales, schedule, members } = params;
  const events: HomeDailyEvent[] = [];

  for (const ci of checkIns.slice(0, 8)) {
    events.push({
      id: `m-ci-${ci.id}`,
      title: ci.memberName,
      subtitle: ci.planName || l3(language, 'Passage tourniquet', 'Gate check-in', 'تسجيل دخول'),
      categoryKey: 'checkin',
      categoryBadge: l3(language, 'Passage Accès', 'Check-in', 'دخول'),
      statusLabel:
        ci.accessStatus === 'Granted'
          ? l3(language, 'Autorisé', 'Granted', 'مسموح')
          : ci.accessStatus === 'Warning_Expiring'
          ? l3(language, 'Expire bientôt', 'Expiring', 'قريب الانتهاء')
          : l3(language, 'Refusé / Alerte', 'Blocked', 'تنبيه'),
      statusTone:
        ci.accessStatus === 'Granted'
          ? 'positive'
          : ci.accessStatus === 'Warning_Expiring'
          ? 'warning'
          : 'danger',
      metricPrimary: ci.planName || 'RFID',
      metricSecondary: hhmm(ci.timestamp),
      timeLabel: hhmm(ci.timestamp),
      sortKey: ci.timestamp || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'history',
      detailCols: [
        { label: l3(language, 'Adhérent', 'Member', 'العضو'), value: ci.memberName },
        { label: l3(language, 'Formule', 'Pass', 'الصيغة'), value: ci.planName || '—' },
        { label: l3(language, 'Heure', 'Time', 'الوقت'), value: hhmm(ci.timestamp) },
      ],
    });
  }

  for (const l of leads.slice(0, 6)) {
    events.push({
      id: `m-lead-${l.id}`,
      title: l.fullName,
      subtitle: [l.preferredPlanName || l.source, l.phoneNumber].filter(Boolean).join(' · '),
      categoryKey: 'lead',
      categoryBadge: l3(language, 'Inscription', 'Inquiry', 'طلب تسجيل'),
      statusLabel:
        l.status === 'Pending'
          ? l3(language, 'En attente', 'Pending', 'معلق')
          : l.status === 'Approved'
          ? l3(language, 'Approuvé', 'Approved', 'مقبول')
          : l3(language, 'Refusé', 'Declined', 'مرفوض'),
      statusTone: l.status === 'Pending' ? 'warning' : l.status === 'Approved' ? 'positive' : 'danger',
      metricPrimary: l.preferredPlanName || l.source || '—',
      metricSecondary: l.phoneNumber || '',
      timeLabel: hhmm(l.createdAt),
      sortKey: l.createdAt || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'registrations',
    });
  }

  if (role !== 'staff') {
    for (const s of sales.slice(0, 6)) {
      events.push({
        id: `m-sale-${s.id}`,
        title: s.memberName || l3(language, 'Vente Boutique Club', 'Club Merch Sale', 'مبيعات النادي'),
        subtitle: [`${s.items?.length || 0} art.`, s.paymentMethod].filter(Boolean).join(' · '),
        categoryKey: 'sale',
        categoryBadge: l3(language, 'Encaissement', 'POS Sale', 'تحصيل'),
        statusLabel: s.status === 'Refunded' ? l3(language, 'Remboursé', 'Refunded', 'مسترجع') : l3(language, 'Encaissé', 'Paid', 'مدفوع'),
        statusTone: s.status === 'Refunded' ? 'danger' : 'positive',
        metricPrimary: formatMoney(s.totalAmount, currency),
        metricSecondary: s.paymentMethod,
        timeLabel: hhmm(s.createdAt),
        sortKey: s.createdAt || '2026-01-01',
        actorOrBranch: branchName,
        targetScreen: 'shop',
      });
    }
  }

  for (const ev of schedule.slice(0, 4)) {
    events.push({
      id: `m-sched-${ev.id}`,
      title: ev.title,
      subtitle: [ev.trainerOrStaff, ev.roomOrArea].filter(Boolean).join(' · '),
      categoryKey: 'class',
      categoryBadge: l3(language, 'Séance', 'Session', 'حصة'),
      statusLabel: ev.enrolledCount >= ev.capacity ? l3(language, 'Complet', 'Full', 'مكتمل') : l3(language, 'Planifié', 'Scheduled', 'مبرمج'),
      statusTone: ev.enrolledCount >= ev.capacity ? 'warning' : 'info',
      metricPrimary: `${ev.enrolledCount}/${ev.capacity}`,
      metricSecondary: ev.startTime,
      timeLabel: ev.startTime,
      sortKey: `2026-${ev.startTime}`,
      actorOrBranch: ev.roomOrArea || branchName,
      targetScreen: 'scheduler',
    });
  }

  for (const m of members.filter((x) => x.status === 'Expired').slice(0, 3)) {
    events.push({
      id: `m-exp-${m.id}`,
      title: m.fullName,
      subtitle: m.membershipPlanName || l3(language, 'Renouvellement requis', 'Renewal required', 'تجديد مطلوب'),
      categoryKey: 'renewal',
      categoryBadge: l3(language, 'Échéance', 'Renewal', 'تجديد'),
      statusLabel: l3(language, 'Expiré', 'Expired', 'منتهي'),
      statusTone: 'danger',
      metricPrimary: m.expirationDate?.slice(0, 10) || '—',
      timeLabel: m.expirationDate?.slice(0, 10) || '—',
      sortKey: m.expirationDate || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'members',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'checkin', label: l3(language, 'Passages', 'Check-ins', 'الدخول') },
      { id: 'lead', label: l3(language, 'Inscriptions', 'Inquiries', 'التسجيلات') },
      ...(role !== 'staff' ? [{ id: 'sale', label: l3(language, 'Ventes', 'Sales', 'المبيعات') }] : []),
      { id: 'class', label: l3(language, 'Séances', 'Classes', 'الحصص') },
      { id: 'renewal', label: l3(language, 'Échéances', 'Renewals', 'التجديدات') },
    ],
  };
}

export function buildAppointmentHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  role: string;
  appointments: Appointment[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, role, appointments } = params;
  const events: HomeDailyEvent[] = appointments.slice(0, 16).map((a) => ({
    id: `appt-${a.id}`,
    title: a.clientName,
    subtitle: [a.serviceName, a.staffName].filter(Boolean).join(' · '),
    categoryKey: a.status === 'InChair' ? 'inchair' : a.status === 'Completed' ? 'completed' : 'booked',
    categoryBadge: a.serviceName || l3(language, 'Soin', 'Service', 'خدمة'),
    statusLabel:
      a.status === 'InChair'
        ? l3(language, 'En fauteuil', 'In Chair', 'قيد الخدمة')
        : a.status === 'Completed'
        ? l3(language, 'Terminé', 'Completed', 'مكتمل')
        : a.status === 'Cancelled'
        ? l3(language, 'Annulé', 'Cancelled', 'ملغى')
        : l3(language, 'Planifié', 'Booked', 'محجوز'),
    statusTone:
      a.status === 'InChair' || a.status === 'Completed'
        ? 'positive'
        : a.status === 'Cancelled'
        ? 'danger'
        : 'warning',
    metricPrimary: formatMoney(a.price, currency),
    metricSecondary: a.isPaid ? l3(language, 'Payé', 'Paid', 'مدفوع') : l3(language, 'À régler', 'Unpaid', 'غير مدفوع'),
    timeLabel: a.startTime,
    sortKey: `${a.date || ''} ${a.startTime || ''}`,
    actorOrBranch: a.staffName || branchName,
    targetScreen: role === 'staff' ? 'scheduler' : a.isPaid ? 'finance' : 'scheduler',
    detailCols: [
      { label: l3(language, 'Client', 'Client', 'الزبون'), value: a.clientName },
      { label: l3(language, 'Praticien', 'Specialist', 'المختص'), value: a.staffName || '—' },
      { label: l3(language, 'Créneau', 'Time', 'الموعد'), value: `${a.date || ''} ${a.startTime}` },
    ],
  }));

  return {
    events: sortRecent(events),
    filters: [
      { id: 'inchair', label: l3(language, 'En fauteuil', 'In Chair', 'جارية') },
      { id: 'booked', label: l3(language, 'À venir', 'Upcoming', 'قادمة') },
      { id: 'completed', label: l3(language, 'Terminés', 'Completed', 'مكتملة') },
    ],
  };
}

export function buildPosHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  sales: Sale[];
  parkedOrders: ParkedOrder[];
  products: Product[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, sales, parkedOrders, products } = params;
  const events: HomeDailyEvent[] = [];

  for (const s of sales.slice(0, 10)) {
    events.push({
      id: `pos-sale-${s.id}`,
      title: s.memberName || l3(language, 'Client Comptoir', 'Walk-in Sale', 'بيع مباشر'),
      subtitle: [`${s.items?.length || 0} art.`, s.paymentMethod].filter(Boolean).join(' · '),
      categoryKey: 'sale',
      categoryBadge: l3(language, 'Ticket POS', 'POS Ticket', 'وصل بيع'),
      statusLabel:
        s.status === 'Refunded'
          ? l3(language, 'Remboursé', 'Refunded', 'مسترجع')
          : s.status === 'Voided'
          ? l3(language, 'Annulé', 'Voided', 'ملغى')
          : l3(language, 'Encaissé', 'Paid', 'مدفوع'),
      statusTone: s.status === 'Refunded' || s.status === 'Voided' ? 'danger' : 'positive',
      metricPrimary: formatMoney(s.totalAmount, currency),
      metricSecondary: s.paymentMethod,
      timeLabel: hhmm(s.createdAt),
      sortKey: s.createdAt || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'registrations',
    });
  }

  for (const po of parkedOrders.slice(0, 4)) {
    events.push({
      id: `pos-park-${po.id}`,
      title: po.referenceName || po.customerName || l3(language, 'Panier suspendu', 'Parked cart', 'سلة معلقة'),
      subtitle: `${po.items?.length || 0} ${l3(language, 'articles en attente', 'items held', 'عناصر')}`,
      categoryKey: 'parked',
      categoryBadge: l3(language, 'Suspendu', 'Parked', 'معلق'),
      statusLabel: l3(language, 'En attente', 'On Hold', 'بانتظار الدفع'),
      statusTone: 'warning',
      metricPrimary: formatMoney(po.totalAmount, currency),
      timeLabel: l3(language, 'En caisse', 'Active', 'بالصندوق'),
      sortKey: '2026-99-parked',
      actorOrBranch: branchName,
      targetScreen: 'shop',
    });
  }

  for (const p of products.filter((x) => x.stockQuantity <= x.reorderLevel).slice(0, 4)) {
    events.push({
      id: `pos-low-${p.id}`,
      title: p.name,
      subtitle: [p.sku, p.category].filter(Boolean).join(' · '),
      categoryKey: 'stock',
      categoryBadge: l3(language, 'Alerte Stock', 'Stock Alert', 'تنبيه مخزون'),
      statusLabel:
        p.stockQuantity <= 0
          ? l3(language, 'Rupture', 'Out of stock', 'نفاد')
          : l3(language, 'Seuil bas', 'Low stock', 'منخفض'),
      statusTone: p.stockQuantity <= 0 ? 'danger' : 'warning',
      metricPrimary: `${p.stockQuantity} ${p.unit || 'u'}`,
      metricSecondary: `Min ${p.reorderLevel}`,
      timeLabel: l3(language, 'Stock', 'Stock', 'المخزون'),
      sortKey: '2026-00-stock',
      actorOrBranch: branchName,
      targetScreen: 'scheduler',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'sale', label: l3(language, 'Tickets', 'Tickets', 'الفواتير') },
      { id: 'parked', label: l3(language, 'Suspendus', 'Parked', 'المعلقة') },
      { id: 'stock', label: l3(language, 'Alertes Stock', 'Low Stock', 'تنبيهات المخزون') },
    ],
  };
}

export function buildEducationHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  role: string;
  sessions: EduSession[];
  admissions: EduAdmissionLead[];
  enrollments: EduEnrollment[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, role, sessions, admissions, enrollments } = params;
  const events: HomeDailyEvent[] = [];

  for (const ses of sessions.slice(0, 8)) {
    events.push({
      id: `edu-ses-${ses.id}`,
      title: ses.cohortName,
      subtitle: [ses.instructorName, ses.classroomName].filter(Boolean).join(' · '),
      categoryKey: 'session',
      categoryBadge: l3(language, 'Séance Cours', 'Class', 'حصة'),
      statusLabel:
        ses.status === 'InProgress'
          ? l3(language, 'En cours', 'In Progress', 'جارية')
          : ses.status === 'Cancelled'
          ? l3(language, 'Annulée', 'Cancelled', 'ملغاة')
          : l3(language, 'Planifiée', 'Scheduled', 'مبرمجة'),
      statusTone: ses.status === 'InProgress' ? 'positive' : ses.status === 'Cancelled' ? 'danger' : 'info',
      metricPrimary: `${ses.startTime}–${ses.endTime}`,
      metricSecondary: ses.date,
      timeLabel: ses.startTime,
      sortKey: `${ses.date || ''} ${ses.startTime || ''}`,
      actorOrBranch: ses.classroomName || branchName,
      targetScreen: 'scheduler',
    });
  }

  for (const ad of admissions.slice(0, 5)) {
    events.push({
      id: `edu-adm-${ad.id}`,
      title: ad.studentName,
      subtitle: [ad.desiredCourseTitle, ad.phone].filter(Boolean).join(' · '),
      categoryKey: 'admission',
      categoryBadge: l3(language, 'Admission', 'Admission', 'قبول'),
      statusLabel: ad.stage,
      statusTone: ad.stage === 'Admitted' || ad.stage === 'Enrolled' ? 'positive' : ad.stage === 'Declined' ? 'danger' : 'warning',
      metricPrimary: ad.desiredCourseTitle || '—',
      timeLabel: l3(language, 'Candidat', 'Applicant', 'مترشح'),
      sortKey: '2026-01-adm',
      actorOrBranch: branchName,
      targetScreen: 'registrations',
    });
  }

  if (role !== 'staff') {
    for (const en of enrollments.filter((x) => x.balanceDue > 0 || x.paymentStatus === 'Paid').slice(0, 5)) {
      events.push({
        id: `edu-enr-${en.id}`,
        title: en.studentName,
        subtitle: en.cohortName,
        categoryKey: 'tuition',
        categoryBadge: l3(language, 'Scolarité', 'Tuition', 'الأقساط'),
        statusLabel: en.paymentStatus,
        statusTone: en.paymentStatus === 'Paid' ? 'positive' : en.paymentStatus === 'Overdue' ? 'danger' : 'warning',
        metricPrimary: formatMoney(en.balanceDue, currency),
        timeLabel: l3(language, 'Échéance', 'Billing', 'القسط'),
        sortKey: '2026-02-enr',
        actorOrBranch: branchName,
        targetScreen: 'finance',
      });
    }
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'session', label: l3(language, 'Séances', 'Classes', 'الحصص') },
      { id: 'admission', label: l3(language, 'Admissions', 'Admissions', 'القبول') },
      ...(role !== 'staff' ? [{ id: 'tuition', label: l3(language, 'Scolarité', 'Tuition', 'الأقساط') }] : []),
    ],
  };
}

export function buildProjectMilestoneHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  role: string;
  projects: PMProject[];
  printOrders: PMPrintOrder[];
  bats: PMBatDeliverable[];
  missions: PMMission[];
  attendances: PMAttendance[];
  expenses: PMExpense[];
  payrollBatches: PMPayrollBatch[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, role, projects, printOrders, bats, missions, attendances, expenses, payrollBatches } = params;
  const events: HomeDailyEvent[] = [];

  if (role === 'direction' || role === 'chef_projet') {
    for (const p of projects.slice(0, 5)) {
      events.push({
        id: `pm-proj-${p.id}`,
        title: p.title,
        subtitle: [p.clientName, p.projectManagerName].filter(Boolean).join(' · '),
        categoryKey: 'project',
        categoryBadge: l3(language, 'Projet', 'Project', 'مشروع'),
        statusLabel: p.status,
        statusTone: p.status === 'closed' || p.status === 'completed' ? 'neutral' : 'positive',
        metricPrimary: formatMoney(p.budgetCapDzd, currency),
        timeLabel: p.endDate?.slice(0, 10) || '—',
        sortKey: p.endDate || '2026-01-01',
        actorOrBranch: p.projectManagerName || branchName,
        targetScreen: role === 'direction' ? 'pm_dir_projects' : 'pm_cp_projects',
        targetPmSubScreen: role === 'direction' ? 'dashboard' : 'portfolio',
      });
    }
  }

  if (role === 'direction' || role === 'chef_projet' || role === 'crea') {
    for (const b of bats.slice(0, 5)) {
      events.push({
        id: `pm-bat-${b.id}`,
        title: b.title,
        subtitle: [b.projectTitle, b.versionCode, `${b.resolutionDpi} DPI`].filter(Boolean).join(' · '),
        categoryKey: 'bat',
        categoryBadge: 'BAT / Créa',
        statusLabel:
          b.approvalStatus === 'approved'
            ? l3(language, 'Validé', 'Approved', 'معتمد')
            : b.approvalStatus === 'revision_requested'
            ? l3(language, 'Révision', 'Revision', 'مراجعة')
            : l3(language, 'En revue', 'Pending', 'قيد المراجعة'),
        statusTone: b.approvalStatus === 'approved' ? 'positive' : b.approvalStatus === 'revision_requested' ? 'danger' : 'warning',
        metricPrimary: `${b.resolutionDpi} DPI`,
        timeLabel: b.versionCode || 'V1',
        sortKey: '2026-05-bat',
        actorOrBranch: branchName,
        targetScreen: role === 'crea' ? 'pm_crea_kanban' : 'pm_cp_files',
        targetPmSubScreen: role === 'crea' ? 'demandes' : 'bat',
      });
    }
    for (const po of printOrders.slice(0, 4)) {
      events.push({
        id: `pm-po-${po.id}`,
        title: `${po.orderNumber} · ${po.projectTitle}`,
        subtitle: `${po.items?.length || 0} ${l3(language, 'supports PLV', 'items', 'عناصر')}`,
        categoryKey: 'print',
        categoryBadge: l3(language, 'Impression', 'Print', 'طباعة'),
        statusLabel: po.status,
        statusTone: po.status === 'delivered' ? 'positive' : 'warning',
        metricPrimary: formatMoney(po.totalCostDzd, currency),
        timeLabel: po.orderNumber,
        sortKey: '2026-04-po',
        actorOrBranch: branchName,
        targetScreen: 'pm_cp_orders',
        targetPmSubScreen: 'orders',
      });
    }
  }

  if (role === 'direction' || role === 'superviseur' || role === 'rh') {
    for (const m of missions.slice(0, 5)) {
      events.push({
        id: `pm-mis-${m.id}`,
        title: `${m.code} · ${m.title}`,
        subtitle: [m.wilayaName, m.venueName].filter(Boolean).join(' · '),
        categoryKey: 'mission',
        categoryBadge: l3(language, 'Mission Terrain', 'Mission', 'مهمة'),
        statusLabel: m.status === 'live_today' ? l3(language, 'En direct', 'Live', 'مباشرة') : m.status,
        statusTone: m.status === 'live_today' ? 'positive' : m.status === 'cancelled' ? 'danger' : 'warning',
        metricPrimary: `${m.requiredStaffCount} staff`,
        timeLabel: m.dailyStartHour,
        sortKey: `${m.startDate || ''} ${m.dailyStartHour}`,
        actorOrBranch: m.wilayaName || branchName,
        targetScreen: 'pm_sup_missions',
        targetPmSubScreen: 'missions',
      });
    }
    for (const a of attendances.slice(0, 4)) {
      events.push({
        id: `pm-att-${a.id}`,
        title: a.talentName,
        subtitle: [a.date, a.checkInTime].filter(Boolean).join(' · '),
        categoryKey: 'attendance',
        categoryBadge: l3(language, 'Pointage', 'Roll Call', 'الحضور'),
        statusLabel: a.status,
        statusTone: a.status === 'present' ? 'positive' : a.status === 'late' ? 'warning' : 'danger',
        metricPrimary: formatMoney(a.grossPayableDzd, currency),
        timeLabel: a.checkInTime || a.date,
        sortKey: `${a.date} ${a.checkInTime || ''}`,
        actorOrBranch: branchName,
        targetScreen: 'pm_sup_attendance',
        targetPmSubScreen: 'attendance',
      });
    }
  }

  if (role === 'direction' || role === 'compta' || role === 'chef_projet' || role === 'superviseur') {
    for (const e of expenses.slice(0, 4)) {
      events.push({
        id: `pm-exp-${e.id}`,
        title: e.title,
        subtitle: [e.projectTitle, e.declaredByUserName].filter(Boolean).join(' · '),
        categoryKey: 'expense',
        categoryBadge: l3(language, 'Note de Frais', 'Expense', 'مصروف'),
        statusLabel: e.status,
        statusTone:
          e.status === 'approved_by_direction' || e.status === 'audited_and_paid'
            ? 'positive'
            : e.status === 'rejected'
            ? 'danger'
            : 'warning',
        metricPrimary: formatMoney(e.amountDzd, currency),
        timeLabel: e.createdAt?.slice(0, 10) || '—',
        sortKey: e.createdAt || '2026-01-01',
        actorOrBranch: e.declaredByUserName || branchName,
        targetScreen: role === 'compta' ? 'pm_compta_expenses' : 'pm_dir_approvals',
        targetPmSubScreen: role === 'compta' ? 'expenses' : 'approvals',
      });
    }
  }

  if (role === 'direction' || role === 'compta') {
    for (const b of payrollBatches.slice(0, 4)) {
      events.push({
        id: `pm-pay-${b.id}`,
        title: b.batchNumber,
        subtitle: [b.projectTitle, `${b.totalBeneficiaries} bénéf.`].filter(Boolean).join(' · '),
        categoryKey: 'payroll',
        categoryBadge: l3(language, 'Paie / CCP', 'Payroll', 'الرواتب'),
        statusLabel: b.status,
        statusTone: b.status === 'disbursed' ? 'positive' : 'warning',
        metricPrimary: formatMoney(b.totalAmountDzd, currency),
        timeLabel: b.batchNumber,
        sortKey: '2026-03-pay',
        actorOrBranch: branchName,
        targetScreen: 'pm_compta_payroll',
        targetPmSubScreen: 'payroll',
      });
    }
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'project', label: l3(language, 'Projets', 'Projects', 'المشاريع') },
      { id: 'bat', label: 'BAT / Créa' },
      { id: 'print', label: l3(language, 'Impressions', 'Print', 'الطباعة') },
      { id: 'mission', label: l3(language, 'Missions', 'Missions', 'المهمات') },
      { id: 'attendance', label: l3(language, 'Pointage', 'Roll Call', 'الحضور') },
      { id: 'expense', label: l3(language, 'Frais', 'Expenses', 'المصاريف') },
      { id: 'payroll', label: l3(language, 'Paie', 'Payroll', 'الرواتب') },
    ],
  };
}

export function buildVenueHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  bookings: RentalBooking[];
  deposits: SecurityDepositRecord[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, bookings, deposits } = params;
  const events: HomeDailyEvent[] = [];

  for (const b of bookings.slice(0, 10)) {
    events.push({
      id: `ren-bk-${b.id}`,
      title: `${b.unitName} · ${b.renterName}`,
      subtitle: [b.purpose, b.startDateTime?.slice(0, 16)].filter(Boolean).join(' · '),
      categoryKey: 'booking',
      categoryBadge: l3(language, 'Réservation', 'Booking', 'حجز'),
      statusLabel: b.status,
      statusTone: b.status === 'CheckedIn' || b.status === 'Confirmed' ? 'positive' : b.status === 'Cancelled' ? 'danger' : 'warning',
      metricPrimary: formatMoney(b.totalAmount, currency),
      timeLabel: hhmm(b.startDateTime),
      sortKey: b.startDateTime || '2026-01-01',
      actorOrBranch: b.unitName || branchName,
      targetScreen: 'scheduler',
    });
  }

  for (const d of deposits.slice(0, 6)) {
    events.push({
      id: `ren-dep-${d.id}`,
      title: d.renterName,
      subtitle: [d.unitName, d.paymentMethod].filter(Boolean).join(' · '),
      categoryKey: 'deposit',
      categoryBadge: l3(language, 'Caution', 'Deposit', 'ضمان'),
      statusLabel: d.status,
      statusTone: d.status === 'Held' ? 'warning' : d.status === 'Released' ? 'positive' : 'danger',
      metricPrimary: formatMoney(d.amount, currency),
      timeLabel: d.paymentMethod,
      sortKey: '2026-02-dep',
      actorOrBranch: d.unitName || branchName,
      targetScreen: 'finance',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'booking', label: l3(language, 'Réservations', 'Bookings', 'الحجوزات') },
      { id: 'deposit', label: l3(language, 'Cautions', 'Deposits', 'الضمانات') },
    ],
  };
}

export function buildFreelanceHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  timeLogs: TimeLogEntry[];
  invoices: FreelanceInvoice[];
  proposals: FreelanceProposal[];
  projects: FreelanceProject[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, timeLogs, invoices, proposals, projects } = params;
  const events: HomeDailyEvent[] = [];

  for (const tl of timeLogs.slice(0, 6)) {
    events.push({
      id: `frl-tl-${tl.id}`,
      title: tl.taskDescription,
      subtitle: [tl.projectTitle, tl.date].filter(Boolean).join(' · '),
      categoryKey: 'timelog',
      categoryBadge: l3(language, 'Temps', 'Time Log', 'ساعات العمل'),
      statusLabel: tl.isInvoiced ? l3(language, 'Facturé', 'Invoiced', 'مفوترة') : l3(language, 'À facturer', 'Unbilled', 'غير مفوترة'),
      statusTone: tl.isInvoiced ? 'positive' : 'warning',
      metricPrimary: `${(tl.durationSeconds / 3600).toFixed(1)}h`,
      timeLabel: tl.date,
      sortKey: tl.date || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'analytics',
    });
  }

  for (const inv of invoices.slice(0, 6)) {
    events.push({
      id: `frl-inv-${inv.id}`,
      title: `${inv.invoiceNumber} · ${inv.clientName}`,
      subtitle: inv.dueDate,
      categoryKey: 'invoice',
      categoryBadge: l3(language, 'Facture', 'Invoice', 'فاتورة'),
      statusLabel: inv.status,
      statusTone: inv.status === 'Paid' ? 'positive' : inv.status === 'Overdue' ? 'danger' : 'warning',
      metricPrimary: formatMoney(inv.totalAmount, inv.currency || currency),
      timeLabel: inv.dueDate,
      sortKey: inv.dueDate || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'shop',
    });
  }

  for (const pr of proposals.slice(0, 4)) {
    events.push({
      id: `frl-pr-${pr.id}`,
      title: pr.title,
      subtitle: [pr.clientName, pr.validUntil].filter(Boolean).join(' · '),
      categoryKey: 'proposal',
      categoryBadge: l3(language, 'Devis', 'Proposal', 'عرض سعر'),
      statusLabel: pr.status,
      statusTone: pr.status === 'Accepted' ? 'positive' : pr.status === 'Declined' ? 'danger' : 'warning',
      metricPrimary: formatMoney(pr.proposedBudget, pr.currency || currency),
      timeLabel: pr.validUntil,
      sortKey: pr.validUntil || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'registrations',
    });
  }

  for (const pj of projects.slice(0, 3)) {
    events.push({
      id: `frl-pj-${pj.id}`,
      title: pj.title,
      subtitle: [pj.clientName, pj.deadline].filter(Boolean).join(' · '),
      categoryKey: 'project',
      categoryBadge: l3(language, 'Projet', 'Project', 'مشروع'),
      statusLabel: pj.stage,
      statusTone: pj.stage === 'Approved' || pj.stage === 'Billed' ? 'positive' : 'info',
      metricPrimary: formatMoney(pj.budget, pj.currency || currency),
      timeLabel: pj.deadline,
      sortKey: pj.deadline || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'scheduler',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'timelog', label: l3(language, 'Heures', 'Time Logs', 'الساعات') },
      { id: 'invoice', label: l3(language, 'Factures', 'Invoices', 'الفواتير') },
      { id: 'proposal', label: l3(language, 'Devis', 'Proposals', 'العروض') },
      { id: 'project', label: l3(language, 'Projets', 'Projects', 'المشاريع') },
    ],
  };
}

export function buildTradingHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  salesDocs: CommercialDocument[];
  purchaseDocs: PurchaseDocument[];
  warehouses: WarehouseDepot[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, salesDocs, purchaseDocs, warehouses } = params;
  const events: HomeDailyEvent[] = [];

  for (const d of salesDocs.slice(0, 8)) {
    events.push({
      id: `trd-s-${d.id}`,
      title: `${d.docNumber} · ${d.clientName}`,
      subtitle: [d.type.toUpperCase(), d.date].join(' · '),
      categoryKey: 'sales',
      categoryBadge: d.type.toUpperCase(),
      statusLabel: d.status,
      statusTone: d.status === 'Paid' ? 'positive' : d.status === 'Canceled' ? 'danger' : 'warning',
      metricPrimary: formatMoney(d.netToPay, d.currency || currency),
      timeLabel: d.date,
      sortKey: d.date || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'trading_sales',
    });
  }

  for (const p of purchaseDocs.slice(0, 6)) {
    events.push({
      id: `trd-p-${p.id}`,
      title: `${p.docNumber} · ${p.supplierName}`,
      subtitle: [p.type.toUpperCase(), p.orderDate].join(' · '),
      categoryKey: 'purchases',
      categoryBadge: l3(language, 'Achat B2B', 'Purchase', 'شراء'),
      statusLabel: p.status,
      statusTone: p.status === 'Paid' || p.status === 'Received' ? 'positive' : 'warning',
      metricPrimary: formatMoney(p.totalTtc, p.currency || currency),
      timeLabel: p.orderDate,
      sortKey: p.orderDate || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'trading_purchases',
    });
  }

  for (const w of warehouses.slice(0, 3)) {
    events.push({
      id: `trd-w-${w.id}`,
      title: `${w.code} · ${w.name}`,
      subtitle: [w.city, `${w.totalSkusCount} SKUs`].filter(Boolean).join(' · '),
      categoryKey: 'depot',
      categoryBadge: l3(language, 'Dépôt', 'Warehouse', 'مستودع'),
      statusLabel: l3(language, 'Actif', 'Active', 'نشط'),
      statusTone: 'info',
      metricPrimary: formatMoney(w.totalValuationDzd, currency),
      timeLabel: w.code,
      sortKey: '2026-00-depot',
      actorOrBranch: w.city || branchName,
      targetScreen: 'trading_inventory',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'sales', label: l3(language, 'Ventes', 'Sales', 'المبيعات') },
      { id: 'purchases', label: l3(language, 'Achats', 'Purchases', 'المشتريات') },
      { id: 'depot', label: l3(language, 'Dépôts', 'Depots', 'المخازن') },
    ],
  };
}

export function buildMedicalHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  consultations: MedicalConsultation[];
  appointments: MedicalAppointmentSlot[];
  prescriptions: MedicalPrescription[];
  chifaClaims: ChifaClaimRecord[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, consultations, appointments, prescriptions, chifaClaims } = params;
  const events: HomeDailyEvent[] = [];

  for (const c of consultations.slice(0, 8)) {
    events.push({
      id: `med-c-${c.id}`,
      title: `${c.ticketNumber || '#'} · ${c.patientName}`,
      subtitle: [c.chiefComplaint, c.doctorName].filter(Boolean).join(' · '),
      categoryKey: 'triage',
      categoryBadge: c.ngapCode || l3(language, 'Consultation', 'Visit', 'فحص'),
      statusLabel: c.status,
      statusTone: c.urgencyLevel === 'Urgence' ? 'danger' : c.status === 'InConsultation' ? 'positive' : 'warning',
      metricPrimary: formatMoney(c.consultationFeeDzd, currency),
      timeLabel: c.ticketNumber || '—',
      sortKey: `2026-05-${c.id}`,
      actorOrBranch: c.doctorName || branchName,
      targetScreen: 'scheduler',
    });
  }

  for (const a of appointments.slice(0, 5)) {
    events.push({
      id: `med-a-${a.id}`,
      title: `${a.startTime} · ${a.patientName}`,
      subtitle: [a.doctorName, a.reason].filter(Boolean).join(' · '),
      categoryKey: 'agenda',
      categoryBadge: l3(language, 'Rendez-vous', 'Agenda', 'موعد'),
      statusLabel: a.status,
      statusTone: a.status === 'InRoom' || a.status === 'Arrived' ? 'positive' : 'info',
      metricPrimary: a.startTime,
      timeLabel: a.startTime,
      sortKey: `2026-04-${a.startTime}`,
      actorOrBranch: a.doctorName || branchName,
      targetScreen: 'agenda',
    });
  }

  for (const rx of prescriptions.slice(0, 4)) {
    events.push({
      id: `med-rx-${rx.id}`,
      title: rx.patientName,
      subtitle: [rx.doctorName || rx.prescribingDoctorName, rx.prescriptionDate].filter(Boolean).join(' · '),
      categoryKey: 'rx',
      categoryBadge: l3(language, 'Ordonnance', 'Rx', 'وصفة'),
      statusLabel: rx.isSigned ? l3(language, 'Signée', 'Signed', 'موقعة') : l3(language, 'Brouillon', 'Draft', 'مسودة'),
      statusTone: rx.isSigned ? 'positive' : 'warning',
      metricPrimary: `${rx.items?.length || 0} méd.`,
      timeLabel: rx.prescriptionDate,
      sortKey: rx.prescriptionDate || '2026-01-01',
      actorOrBranch: rx.doctorName || branchName,
      targetScreen: 'shop',
    });
  }

  for (const cl of chifaClaims.slice(0, 4)) {
    events.push({
      id: `med-ch-${cl.id}`,
      title: `${cl.patientName} · ${cl.ngapCode}`,
      subtitle: cl.bordereauNumber || cl.chifaNumber,
      categoryKey: 'chifa',
      categoryBadge: 'Chifa / CNAS',
      statusLabel: cl.status || l3(language, 'En attente', 'Pending', 'معلق'),
      statusTone: cl.status === 'Reimbursed' ? 'positive' : cl.status === 'Rejected' ? 'danger' : 'warning',
      metricPrimary: formatMoney(cl.totalAmountDzd, currency),
      timeLabel: cl.ngapCode,
      sortKey: '2026-02-chifa',
      actorOrBranch: branchName,
      targetScreen: 'finance',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'triage', label: l3(language, 'Triage / Consults', 'Triage', 'الفرز') },
      { id: 'agenda', label: l3(language, 'Agenda', 'Agenda', 'المواعيد') },
      { id: 'rx', label: l3(language, 'Ordonnances', 'Rx', 'الوصفات') },
      { id: 'chifa', label: 'Chifa' },
    ],
  };
}

export function buildGarageHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  role: string;
  orders: RepairOrder[];
  invoices: GarageInvoice[];
  parts: SparePart[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, role, orders, invoices, parts } = params;
  const events: HomeDailyEvent[] = [];

  for (const o of orders.slice(0, 8)) {
    events.push({
      id: `gar-or-${o.id}`,
      title: `${o.orderNumber} · ${o.vehiclePlate}`,
      subtitle: [o.vehicleModel, o.clientName, o.technicianName].filter(Boolean).join(' · '),
      categoryKey: 'or',
      categoryBadge: l3(language, 'Ordre OR', 'Work Order', 'أمر تصليح'),
      statusLabel: o.status,
      statusTone: o.status === 'ReadyForPickup' || o.status === 'Delivered' ? 'positive' : o.status === 'WaitingParts' ? 'danger' : 'warning',
      metricPrimary: formatMoney(o.finalCostDzd || o.estimatedCostDzd, currency),
      timeLabel: o.orderNumber,
      sortKey: `2026-05-${o.orderNumber}`,
      actorOrBranch: o.technicianName || branchName,
      targetScreen: 'scheduler',
    });
  }

  if (role !== 'mecanicien' && role !== 'magasinier') {
    for (const inv of invoices.slice(0, 5)) {
      events.push({
        id: `gar-inv-${inv.id}`,
        title: `${inv.invoiceNumber} · ${inv.clientName}`,
        subtitle: inv.vehiclePlate,
        categoryKey: 'billing',
        categoryBadge: l3(language, 'Facture', 'Invoice', 'فاتورة'),
        statusLabel: inv.isPaid ? l3(language, 'Payée', 'Paid', 'مدفوعة') : l3(language, 'À encaisser', 'Due', 'مستحقة'),
        statusTone: inv.isPaid ? 'positive' : 'warning',
        metricPrimary: formatMoney(inv.netToPayDzd || inv.totalTtc, currency),
        timeLabel: inv.invoiceNumber,
        sortKey: `2026-04-${inv.invoiceNumber}`,
        actorOrBranch: branchName,
        targetScreen: 'finance',
      });
    }
  }

  for (const p of parts.filter((x) => x.stockQuantity <= x.minThreshold).slice(0, 4)) {
    events.push({
      id: `gar-part-${p.id}`,
      title: p.name,
      subtitle: [p.sku, p.locationBin].filter(Boolean).join(' · '),
      categoryKey: 'parts',
      categoryBadge: l3(language, 'Pièce Critique', 'Low Part', 'نقص قطعة'),
      statusLabel: l3(language, 'Seuil bas', 'Low Stock', 'مخزون منخفض'),
      statusTone: 'danger',
      metricPrimary: `${p.stockQuantity} ${p.unit || 'u'}`,
      timeLabel: p.locationBin || 'Magasin',
      sortKey: '2026-01-parts',
      actorOrBranch: branchName,
      targetScreen: 'shop',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'or', label: l3(language, 'Ordres OR', 'Work Orders', 'أوامر التصليح') },
      ...(role !== 'mecanicien' && role !== 'magasinier' ? [{ id: 'billing', label: l3(language, 'Factures', 'Billing', 'الفواتير') }] : []),
      { id: 'parts', label: l3(language, 'Pièces', 'Parts', 'قطع الغيار') },
    ],
  };
}

export function buildRealEstateHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  role: string;
  visits: BonDeVisiteRecord[];
  quittances: RentalQuittanceRecord[];
  mandates: RealEstateMandate[];
  inspections: RealEstateInspection[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, role, visits, quittances, mandates, inspections } = params;
  const events: HomeDailyEvent[] = [];

  for (const v of visits.slice(0, 6)) {
    events.push({
      id: `re-v-${v.id}`,
      title: `${v.clientFullName} · ${v.propertyTitle}`,
      subtitle: [v.negotiatorName, v.visitTimestamp?.slice(0, 10)].filter(Boolean).join(' · '),
      categoryKey: 'visit',
      categoryBadge: l3(language, 'Visite GPS', 'Visit Slip', 'زيارة ميدانية'),
      statusLabel: v.clientImpression || l3(language, 'Visité', 'Visited', 'تمت الزيارة'),
      statusTone: v.clientImpression === 'OfferSubmitted' || v.clientImpression === 'Interested' ? 'positive' : 'neutral',
      metricPrimary: v.negotiatorName || 'Agent',
      timeLabel: hhmm(v.visitTimestamp),
      sortKey: v.visitTimestamp || '2026-01-01',
      actorOrBranch: v.negotiatorName || branchName,
      targetScreen: 'registrations',
    });
  }

  if (role !== 'negociateur') {
    for (const q of quittances.slice(0, 6)) {
      events.push({
        id: `re-q-${q.id}`,
        title: `${q.quittanceNumber} · ${q.tenantName}`,
        subtitle: `${q.propertyTitle} · ${q.periodMonth}/${q.periodYear}`,
        categoryKey: 'quittance',
        categoryBadge: l3(language, 'Quittance', 'Rent Receipt', 'وصل إيجار'),
        statusLabel: q.isDisbursedToOwner ? l3(language, 'Reversé', 'Disbursed', 'مسلم للمالك') : l3(language, 'Encaissé', 'Collected', 'محصل'),
        statusTone: q.isDisbursedToOwner ? 'positive' : 'warning',
        metricPrimary: formatMoney(q.totalCollectedDzd, currency),
        timeLabel: `${q.periodMonth}/${q.periodYear}`,
        sortKey: `2026-04-${q.periodYear}${q.periodMonth}`,
        actorOrBranch: branchName,
        targetScreen: 'finance',
      });
    }
  }

  if (role !== 'gestionnaire_locatif') {
    for (const m of mandates.slice(0, 4)) {
      events.push({
        id: `re-m-${m.id}`,
        title: `${m.mandateNumber} · ${m.propertyTitle}`,
        subtitle: [m.ownerFullName, m.isExclusive ? 'Exclusif' : 'Simple'].join(' · '),
        categoryKey: 'mandate',
        categoryBadge: l3(language, 'Mandat 09-18', 'Mandate', 'وكالة'),
        statusLabel: m.status,
        statusTone: m.status === 'Active' ? 'positive' : 'warning',
        metricPrimary: formatMoney(m.askingPriceDzd, currency),
        timeLabel: m.mandateNumber,
        sortKey: '2026-03-mandate',
        actorOrBranch: branchName,
        targetScreen: 'realestate_mandates',
      });
    }
  }

  for (const ins of inspections.slice(0, 3)) {
    events.push({
      id: `re-ins-${ins.id}`,
      title: ins.propertyTitle,
      subtitle: `${ins.inspectionDate} · ${ins.generalCondition}`,
      categoryKey: 'inspection',
      categoryBadge: l3(language, 'État des lieux', 'Inspection', 'معاينة'),
      statusLabel: ins.isSigned ? l3(language, 'Signé', 'Signed', 'موقع') : l3(language, 'Brouillon', 'Draft', 'مسودة'),
      statusTone: ins.isSigned ? 'positive' : 'warning',
      metricPrimary: ins.generalCondition,
      timeLabel: ins.inspectionDate,
      sortKey: ins.inspectionDate || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'registrations',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'visit', label: l3(language, 'Visites', 'Visits', 'الزيارات') },
      ...(role !== 'negociateur' ? [{ id: 'quittance', label: l3(language, 'Quittances', 'Receipts', 'الوصولات') }] : []),
      ...(role !== 'gestionnaire_locatif' ? [{ id: 'mandate', label: l3(language, 'Mandats', 'Mandates', 'الوكالات') }] : []),
      { id: 'inspection', label: l3(language, 'États lieux', 'Inspections', 'المعاينات') },
    ],
  };
}

export function buildManufacturingHistorique(params: {
  language: SupportedLanguage;
  branchName: string;
  role: string;
  orders: ManufacturingOrder[];
  qcRecords: QualityInspectionRecord[];
  materials: RawMaterialStockItem[];
}): HomeHistoriqueBundle {
  const { language, branchName, role, orders, qcRecords, materials } = params;
  const events: HomeDailyEvent[] = [];

  if (role !== 'magasinier') {
    for (const o of orders.slice(0, 8)) {
      events.push({
        id: `mfg-of-${o.id}`,
        title: `${o.orderNumber} · ${o.productName}`,
        subtitle: `${o.actualQuantityProduced || 0}/${o.targetQuantity} · ${o.dueDate}`,
        categoryKey: 'of',
        categoryBadge: l3(language, 'Ordre OF', 'Work Order', 'أمر تصنيع'),
        statusLabel: o.status,
        statusTone: o.status === 'Completed' ? 'positive' : o.status === 'QC' || o.status === 'QC_Pending' ? 'warning' : 'info',
        metricPrimary: `${o.actualQuantityProduced || 0}/${o.targetQuantity}`,
        timeLabel: o.dueDate,
        sortKey: o.dueDate || '2026-01-01',
        actorOrBranch: branchName,
        targetScreen: 'scheduler',
      });
    }
  }

  if (role !== 'magasinier') {
    for (const q of qcRecords.slice(0, 5)) {
      events.push({
        id: `mfg-qc-${q.id}`,
        title: `${q.inspectionNumber} · ${q.productName}`,
        subtitle: [q.orderNumber, `Lot ${q.batchLotNumber}`].join(' · '),
        categoryKey: 'qc',
        categoryBadge: l3(language, 'Contrôle QC', 'QC Lot', 'فحص جودة'),
        statusLabel: q.verdict,
        statusTone: q.verdict === 'Accepted' ? 'positive' : q.verdict === 'Quarantined' || q.verdict === 'Scrapped' ? 'danger' : 'warning',
        metricPrimary: `${q.acceptedQuantity}/${q.inspectedQuantity}`,
        timeLabel: q.batchLotNumber,
        sortKey: '2026-03-qc',
        actorOrBranch: branchName,
        targetScreen: 'finance',
      });
    }
  }

  if (role !== 'qualite') {
    for (const m of materials.filter((x) => x.availableStock <= x.reorderThreshold).slice(0, 5)) {
      events.push({
        id: `mfg-mat-${m.id}`,
        title: m.name,
        subtitle: [m.sku, m.warehouseLocation].filter(Boolean).join(' · '),
        categoryKey: 'material',
        categoryBadge: l3(language, 'Matière MP', 'Raw Material', 'مادة أولية'),
        statusLabel: l3(language, 'Sous seuil', 'Low Stock', 'مخزون منخفض'),
        statusTone: 'danger',
        metricPrimary: `${m.availableStock} ${m.unit}`,
        timeLabel: m.warehouseLocation || 'Magasin',
        sortKey: '2026-01-mat',
        actorOrBranch: branchName,
        targetScreen: 'members',
      });
    }
  }

  return {
    events: sortRecent(events),
    filters: [
      ...(role !== 'magasinier' ? [{ id: 'of', label: l3(language, 'Ordres OF', 'Orders', 'التصنيع') }] : []),
      ...(role !== 'magasinier' ? [{ id: 'qc', label: 'QC' }] : []),
      ...(role !== 'qualite' ? [{ id: 'material', label: l3(language, 'Matières', 'Materials', 'المواد') }] : []),
    ],
  };
}

export function buildLegalHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  role: string;
  hearings: LegalHearing[];
  deadlines: CPCADeadline[];
  matters: LegalMatter[];
  notaryDeeds: NotaryDeed[];
  scfEntries: SCFJournalEntry[];
  cashReceipts: CashReceipt[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, role, hearings, deadlines, matters, notaryDeeds, scfEntries, cashReceipts } = params;
  const events: HomeDailyEvent[] = [];

  if (role === 'notaire_titulaire') {
    for (const d of notaryDeeds.slice(0, 6)) {
      events.push({
        id: `leg-deed-${d.id}`,
        title: `${d.repertoireNumber} · ${language === 'ar' && d.titleAr ? d.titleAr : d.title}`,
        subtitle: [d.parties?.vendorName, d.parties?.purchaserName].filter(Boolean).join(' → '),
        categoryKey: 'deed',
        categoryBadge: l3(language, 'Acte Notarié', 'Deed', 'عقد توثيقي'),
        statusLabel: d.status,
        statusTone: d.status === 'publie_conservation' ? 'positive' : 'warning',
        metricPrimary: formatMoney(d.transactionValueDzd, currency),
        timeLabel: d.repertoireNumber,
        sortKey: '2026-05-deed',
        actorOrBranch: branchName,
        targetScreen: 'members',
      });
    }
  } else if (role === 'expert_comptable') {
    for (const s of scfEntries.slice(0, 8)) {
      events.push({
        id: `leg-scf-${s.id}`,
        title: `${s.entryNumber} · ${s.libelle}`,
        subtitle: [s.journalCode, s.date].join(' · '),
        categoryKey: 'scf',
        categoryBadge: `SCF ${s.journalCode}`,
        statusLabel: s.status,
        statusTone: s.status === 'validated' ? 'positive' : 'warning',
        metricPrimary: formatMoney(s.totalDebitDzd, currency),
        timeLabel: s.date,
        sortKey: s.date || '2026-01-01',
        actorOrBranch: branchName,
        targetScreen: 'finance',
      });
    }
  } else {
    for (const h of hearings.slice(0, 6)) {
      events.push({
        id: `leg-h-${h.id}`,
        title: (language === 'ar' && h.matterTitleAr ? h.matterTitleAr : h.matterTitle) || h.matterNumber || 'Audience',
        subtitle: [h.courtName, h.hearingDate, h.hearingTime].filter(Boolean).join(' · '),
        categoryKey: 'hearing',
        categoryBadge: l3(language, 'Audience', 'Hearing', 'جلسة'),
        statusLabel: h.status || h.chamber || '—',
        statusTone: h.status === 'Postponed' ? 'warning' : h.status === 'Ruled' ? 'positive' : 'info',
        metricPrimary: h.hearingTime || '—',
        timeLabel: h.hearingDate || '—',
        sortKey: `${h.hearingDate || ''} ${h.hearingTime || ''}`,
        actorOrBranch: h.courtName || branchName,
        targetScreen: 'scheduler',
      });
    }
    for (const dl of deadlines.slice(0, 4)) {
      events.push({
        id: `leg-dl-${dl.id}`,
        title: `${dl.caseNumber} · ${dl.recourseType}`,
        subtitle: [dl.courtJurisdiction, dl.terminalExpiryDate].filter(Boolean).join(' · '),
        categoryKey: 'deadline',
        categoryBadge: 'CPCA',
        statusLabel: dl.status,
        statusTone: dl.status === 'critical' ? 'danger' : dl.status === 'approaching' ? 'warning' : 'positive',
        metricPrimary: dl.terminalExpiryDate,
        timeLabel: dl.terminalExpiryDate,
        sortKey: dl.terminalExpiryDate || '2026-01-01',
        actorOrBranch: dl.courtJurisdiction || branchName,
        targetScreen: 'scheduler',
      });
    }
    for (const m of matters.slice(0, 4)) {
      events.push({
        id: `leg-m-${m.id}`,
        title: `${m.matterNumber} · ${language === 'ar' && m.titleAr ? m.titleAr : m.title}`,
        subtitle: [language === 'ar' && m.clientNameAr ? m.clientNameAr : m.clientName, m.courtJurisdiction].filter(Boolean).join(' · '),
        categoryKey: 'matter',
        categoryBadge: l3(language, 'Dossier', 'Matter', 'قضية'),
        statusLabel: m.status,
        statusTone: m.status === 'Closed' ? 'neutral' : 'positive',
        metricPrimary: formatMoney(m.retainerAmountDzd, currency),
        timeLabel: m.matterNumber,
        sortKey: '2026-02-matter',
        actorOrBranch: branchName,
        targetScreen: 'members',
      });
    }
  }

  for (const r of cashReceipts.slice(0, 4)) {
    events.push({
      id: `leg-rec-${r.id}`,
      title: `${r.receiptNumber} · ${r.clientName}`,
      subtitle: [r.matterTitle, r.paymentMethod].filter(Boolean).join(' · '),
      categoryKey: 'receipt',
      categoryBadge: l3(language, 'Encaissement', 'Receipt', 'وصل قبض'),
      statusLabel: l3(language, 'Encaissé', 'Paid', 'محصل'),
      statusTone: 'positive',
      metricPrimary: formatMoney(r.netCollectedDzd, currency),
      timeLabel: r.receiptNumber,
      sortKey: '2026-04-rec',
      actorOrBranch: branchName,
      targetScreen: 'finance',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      ...(role === 'notaire_titulaire' ? [{ id: 'deed', label: l3(language, 'Actes', 'Deeds', 'العقود') }] : []),
      ...(role === 'expert_comptable' ? [{ id: 'scf', label: 'SCF' }] : []),
      ...(role !== 'notaire_titulaire' && role !== 'expert_comptable'
        ? [
            { id: 'hearing', label: l3(language, 'Audiences', 'Hearings', 'الجلسات') },
            { id: 'deadline', label: 'CPCA' },
            { id: 'matter', label: l3(language, 'Dossiers', 'Matters', 'القضايا') },
          ]
        : []),
      { id: 'receipt', label: l3(language, 'Caisse', 'Cashier', 'الصندوق') },
    ],
  };
}

export function buildLogisticsHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  shipments: LogisticsShipment[];
  manifests: LogisticsManifest[];
  bags: TransportBag[];
  remittances: MerchantRemittanceBatch[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, shipments, manifests, bags, remittances } = params;
  const events: HomeDailyEvent[] = [];

  for (const s of shipments.slice(0, 8)) {
    events.push({
      id: `log-s-${s.id}`,
      title: `${s.trackingCode} · ${s.recipientName}`,
      subtitle: [s.destinationWilaya, s.merchantName, s.deliveryMode].filter(Boolean).join(' · '),
      categoryKey: 'parcel',
      categoryBadge: l3(language, 'Colis', 'Parcel', 'طرد'),
      statusLabel: s.status,
      statusTone:
        s.status === 'Delivered'
          ? 'positive'
          : s.status === 'Returned' || s.status === 'Postponed'
          ? 'danger'
          : 'warning',
      metricPrimary: formatMoney(s.codAmountDzd, currency),
      timeLabel: s.destinationWilaya,
      sortKey: `2026-05-${s.trackingCode}`,
      actorOrBranch: s.destinationWilaya || branchName,
      targetScreen: 'members',
    });
  }

  for (const m of manifests.slice(0, 4)) {
    events.push({
      id: `log-m-${m.id}`,
      title: `${m.manifestNumber} · ${m.driverName}`,
      subtitle: [m.zoneWilaya, m.vehiclePlate, `${m.totalShipmentsCount} colis`].filter(Boolean).join(' · '),
      categoryKey: 'manifest',
      categoryBadge: l3(language, 'Tournée', 'Manifest', 'مسار'),
      statusLabel: m.status,
      statusTone: m.status === 'Reconciled' ? 'positive' : 'warning',
      metricPrimary: formatMoney(m.totalCodExpectedDzd, currency),
      timeLabel: m.zoneWilaya,
      sortKey: `2026-04-${m.manifestNumber}`,
      actorOrBranch: m.driverName || branchName,
      targetScreen: 'scheduler',
    });
  }

  for (const b of bags.slice(0, 4)) {
    events.push({
      id: `log-b-${b.id}`,
      title: `${b.bagCode} · #${b.securitySealNumber}`,
      subtitle: `W${b.originHubWilaya} → W${b.destinationHubWilaya} · ${b.totalItemCount} colis`,
      categoryKey: 'bag',
      categoryBadge: l3(language, 'Sac Hub', 'Shuttle Bag', 'كيس فرز'),
      statusLabel: b.status,
      statusTone: b.status === 'Discrepancy' ? 'danger' : b.status === 'Received' ? 'positive' : 'warning',
      metricPrimary: `${b.totalWeightKg} kg`,
      timeLabel: `W${b.destinationHubWilaya}`,
      sortKey: `2026-03-${b.bagCode}`,
      actorOrBranch: branchName,
      targetScreen: 'registrations',
    });
  }

  for (const r of remittances.slice(0, 3)) {
    events.push({
      id: `log-r-${r.id}`,
      title: `${r.batchNumber} · ${r.merchantName}`,
      subtitle: r.paymentChannel,
      categoryKey: 'cod',
      categoryBadge: 'COD / CCP',
      statusLabel: r.status,
      statusTone: r.status === 'Executed' ? 'positive' : 'warning',
      metricPrimary: formatMoney(r.netPayoutDzd, currency),
      timeLabel: r.paymentChannel,
      sortKey: '2026-02-cod',
      actorOrBranch: branchName,
      targetScreen: 'finance',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'parcel', label: l3(language, 'Colis', 'Parcels', 'الطرود') },
      { id: 'manifest', label: l3(language, 'Tournées', 'Manifests', 'المسارات') },
      { id: 'bag', label: l3(language, 'Sacs Hub', 'Bags', 'الأكياس') },
      { id: 'cod', label: 'COD' },
    ],
  };
}

export function buildContractorHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  dailyLogs: ContractorDailyLog[];
  dgps: ContractorDgp[];
  serviceOrders: ContractorServiceOrder[];
  concretePours: ConcretePourRecord[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, dailyLogs, dgps, serviceOrders, concretePours } = params;
  const events: HomeDailyEvent[] = [];

  for (const dl of dailyLogs.slice(0, 6)) {
    events.push({
      id: `btp-dl-${dl.id}`,
      title: `${dl.date} · ${dl.weather}`,
      subtitle: dl.tasksAccomplished,
      categoryKey: 'log',
      categoryBadge: l3(language, 'Journal Chantier', 'Site Log', 'يومية ورشة'),
      statusLabel: dl.hasWorkStoppage ? l3(language, 'Arrêt intempérie', 'Stoppage', 'توقف') : l3(language, 'Actif', 'Normal', 'نشط'),
      statusTone: dl.hasWorkStoppage ? 'danger' : 'positive',
      metricPrimary: `${dl.headcountWorkers} ouv.`,
      timeLabel: dl.date,
      sortKey: dl.date || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'scheduler',
    });
  }

  for (const d of dgps.slice(0, 5)) {
    events.push({
      id: `btp-dgp-${d.id}`,
      title: `${d.dgpNumber} · ${d.periodLabel}`,
      subtitle: d.issuedDate,
      categoryKey: 'dgp',
      categoryBadge: 'DGP / Situation',
      statusLabel: d.status,
      statusTone: d.status === 'Paid' ? 'positive' : 'warning',
      metricPrimary: formatMoney(d.netPayableDzd, currency),
      timeLabel: d.issuedDate,
      sortKey: d.issuedDate || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'finance',
    });
  }

  for (const os of serviceOrders.slice(0, 4)) {
    events.push({
      id: `btp-os-${os.id}`,
      title: `${os.osNumber} · ${os.osType}`,
      subtitle: os.effectiveDate,
      categoryKey: 'os',
      categoryBadge: 'OS Marché',
      statusLabel: os.status,
      statusTone: os.status === 'Executed' ? 'positive' : 'warning',
      metricPrimary: os.osType,
      timeLabel: os.effectiveDate,
      sortKey: os.effectiveDate || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'members',
    });
  }

  for (const cp of concretePours.slice(0, 3)) {
    events.push({
      id: `btp-cp-${cp.id}`,
      title: `${cp.pourDate || ''} · ${cp.elementPoured || 'Béton'}`,
      subtitle: `${cp.volumePouredM3 || 0} m³ · ${cp.concreteGrade || ''}`,
      categoryKey: 'concrete',
      categoryBadge: l3(language, 'Coulage Béton', 'Concrete', 'صب خرسانة'),
      statusLabel: cp.status || 'CastPending7D',
      statusTone: cp.status === 'NonConforming' ? 'danger' : cp.status === 'CastPending7D' ? 'warning' : 'positive',
      metricPrimary: `${cp.volumePouredM3 || 0} m³`,
      timeLabel: cp.pourDate || '—',
      sortKey: cp.pourDate || '2026-01-01',
      actorOrBranch: branchName,
      targetScreen: 'scheduler',
    });
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'log', label: l3(language, 'Journaux', 'Site Logs', 'اليوميات') },
      { id: 'dgp', label: 'DGP' },
      { id: 'os', label: 'OS' },
      { id: 'concrete', label: l3(language, 'Béton', 'Concrete', 'الخرسانة') },
    ],
  };
}

export function buildAgricultureHistorique(params: {
  language: SupportedLanguage;
  currency: CurrencyCode;
  branchName: string;
  role: string;
  pointages: AgriDailyPointage[];
  milkingRecords: AgriMilkingRecord[];
  weighbridgeTickets: AgriWeighbridgeTicket[];
  cropCycles: AgriCropCycle[];
}): HomeHistoriqueBundle {
  const { language, currency, branchName, role, pointages, milkingRecords, weighbridgeTickets, cropCycles } = params;
  const events: HomeDailyEvent[] = [];

  if (role === 'gerant' || role === 'chef_culture' || role === 'magasinier') {
    for (const pt of pointages.slice(0, 6)) {
      events.push({
        id: `agr-pt-${pt.id}`,
        title: pt.workerName,
        subtitle: [pt.parcelName, `${pt.cratesCollected} caisses`, pt.date].filter(Boolean).join(' · '),
        categoryKey: 'harvest',
        categoryBadge: l3(language, 'Récolte', 'Harvest', 'الجني'),
        statusLabel: pt.isPaid ? l3(language, 'Payé', 'Paid', 'مدفوع') : l3(language, 'Dû', 'Pending', 'مستحق'),
        statusTone: pt.isPaid ? 'positive' : 'warning',
        metricPrimary: formatMoney(pt.netDueDzd, currency),
        timeLabel: pt.date,
        sortKey: pt.date || '2026-01-01',
        actorOrBranch: pt.parcelName || branchName,
        targetScreen: 'shop',
      });
    }
  }

  if (role === 'gerant' || role === 'zootechnicien') {
    for (const m of milkingRecords.slice(0, 6)) {
      events.push({
        id: `agr-milk-${m.id}`,
        title: `${m.sessionDate} · ${m.destinationDairy}`,
        subtitle: `${m.conformingLiters} L conformes`,
        categoryKey: 'dairy',
        categoryBadge: l3(language, 'Lait ONIL', 'ONIL Milk', 'الحليب'),
        statusLabel: m.rejectedWithholdingLiters > 0 ? l3(language, 'Rejet partiel', 'Partial reject', 'رفض جزئي') : l3(language, 'Conforme', 'Compliant', 'مطابق'),
        statusTone: m.rejectedWithholdingLiters > 0 ? 'warning' : 'positive',
        metricPrimary: formatMoney(m.onilTotalSubsidyDzd, currency),
        metricSecondary: `${m.conformingLiters} L`,
        timeLabel: m.sessionDate,
        sortKey: m.sessionDate || '2026-01-01',
        actorOrBranch: m.destinationDairy || branchName,
        targetScreen: 'registrations',
      });
    }
  }

  if (role === 'gerant' || role === 'magasinier') {
    for (const w of weighbridgeTickets.slice(0, 5)) {
      events.push({
        id: `agr-wb-${w.id}`,
        title: `${w.ticketNumber} · ${w.cropDesignation}`,
        subtitle: [w.buyerName, `${w.netWeightKg} kg`].filter(Boolean).join(' · '),
        categoryKey: 'weighbridge',
        categoryBadge: l3(language, 'Pont-Bascule', 'Weighbridge', 'الميزان'),
        statusLabel: w.remainingDueDzd > 0 ? l3(language, 'Solde dû', 'Balance due', 'متبقي') : l3(language, 'Soldé', 'Settled', 'خالص'),
        statusTone: w.remainingDueDzd > 0 ? 'warning' : 'positive',
        metricPrimary: formatMoney(w.totalAmountDzd, currency),
        timeLabel: w.ticketNumber,
        sortKey: '2026-04-wb',
        actorOrBranch: w.buyerName || branchName,
        targetScreen: 'finance',
      });
    }
  }

  if (role === 'gerant' || role === 'chef_culture') {
    for (const c of cropCycles.filter((x) => x.currentPhase === 'treatment_locked' || x.currentPhase === 'ready_harvest').slice(0, 4)) {
      events.push({
        id: `agr-cyc-${c.id}`,
        title: `${c.cropName} · ${c.variety}`,
        subtitle: [c.projectedHarvestDate, c.activeDarLockoutUntil ? `DAR ${c.activeDarLockoutUntil}` : ''].filter(Boolean).join(' · '),
        categoryKey: 'crop',
        categoryBadge: l3(language, 'Culture DAR', 'Crop / DAR', 'الموسم'),
        statusLabel: c.currentPhase === 'treatment_locked' ? l3(language, 'Délai DAR', 'DAR Locked', 'فترة أمان') : l3(language, 'Prêt récolte', 'Ready', 'جاهز للجني'),
        statusTone: c.currentPhase === 'treatment_locked' ? 'danger' : 'positive',
        metricPrimary: `${c.projectedYieldQtx} Qx`,
        timeLabel: c.projectedHarvestDate,
        sortKey: c.projectedHarvestDate || '2026-01-01',
        actorOrBranch: branchName,
        targetScreen: 'scheduler',
      });
    }
  }

  return {
    events: sortRecent(events),
    filters: [
      { id: 'harvest', label: l3(language, 'Récoltes', 'Harvest', 'الجني') },
      { id: 'dairy', label: l3(language, 'Lait ONIL', 'Dairy', 'الحليب') },
      { id: 'weighbridge', label: l3(language, 'Bascule', 'Weighbridge', 'الميزان') },
      { id: 'crop', label: l3(language, 'Cultures', 'Crops', 'المحاصيل') },
    ],
  };
}
