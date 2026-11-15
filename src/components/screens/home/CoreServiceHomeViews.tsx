import React, { useMemo } from 'react';
import {
  Users,
  Calendar,
  ShoppingBag,
  ClipboardList,
  CreditCard,
  History,
  UserPlus,
  Scissors,
  Clock,
  GraduationCap,
  Award,
  Boxes,
  Wallet,
  Sparkles,
  UserCheck,
  Receipt,
} from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentMembersFromState,
  selectCurrentLeadsFromState,
  selectCurrentProductsFromState,
  selectCurrentStaffFromState,
  selectCurrentSalesFromState,
  selectCurrentScheduleFromState,
  selectCurrentAppointmentsFromState,
  selectCurrentServicesFromState,
  selectCurrentParkedOrdersFromState,
  selectCurrentMemberCheckInsFromState,
  selectCurrentEduStudentsFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentEduSessionsFromState,
  selectCurrentEduAdmissionsFromState,
  selectCurrentEduEnrollmentsFromState,
  setScreenAction,
} from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { DashboardPod } from '../../common/dashboard';
import {
  HomeShell,
  HomePodGrid,
  HomeCardsGrid,
  HOME_POD_PULSE_CLASS,
  HOME_POD_DIRECTORY_CLASS,
  HomePreviewCard,
  HomeCompactStrip,
  HomeKioskCard,
  HomeAnchorCard,
  HomePreviewRow,
  HomeQuickAction,
  CATEGORY_HOME_RATIO,
  l3,
} from '../../common/home';

export interface HomeViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
  onAddLead?: () => void;
}

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ============================================================================
// 1. MEMBERSHIP & CLUBS (membership_session) — Ratio 38 / 62
// ============================================================================
export const MembershipHomeView: React.FC<HomeViewProps> = ({
  onAddMember,
  onAddLead,
}) => {
  const { language } = useTranslation();
  const {
    role,
    currency,
    members,
    leads,
    schedule,
    products,
    staff,
    checkIns,
  } = useAtriumSelector(
    (s) => ({
      role: s.activeMembershipRole || 'owner',
      currency: 'DZD',
      members: selectCurrentMembersFromState(s),
      leads: selectCurrentLeadsFromState(s),
      schedule: selectCurrentScheduleFromState(s),
      products: selectCurrentProductsFromState(s),
      staff: selectCurrentStaffFromState(s),
      checkIns: selectCurrentMemberCheckInsFromState(s),
    }),
    shallowEqualObjects
  );

  const isMemberExpiringSoon = (m: (typeof members)[number]) => {
    if (m.status !== 'Active' || !m.expirationDate) return false;
    const diffMs = new Date(m.expirationDate).getTime() - Date.now();
    return diffMs >= 0 && diffMs <= 7 * 86400000;
  };

  const activeCount = useMemo(
    () => members.filter((m) => m.status === 'Active').length,
    [members]
  );
  const expiringCount = useMemo(
    () => members.filter((m) => isMemberExpiringSoon(m) || m.status === 'Expired').length,
    [members]
  );
  const pendingLeadsCount = useMemo(
    () => leads.filter((l) => l.status === 'Pending').length,
    [leads]
  );

  const memberRows: HomePreviewRow[] = useMemo(() => {
    const getPriorityKey = (m: (typeof members)[number]) =>
      isMemberExpiringSoon(m) ? 0 : m.status === 'Active' ? 1 : m.status === 'Expired' ? 2 : 3;
    const prioritized = [...members].sort((a, b) => getPriorityKey(a) - getPriorityKey(b));
    return prioritized.slice(0, 4).map((m) => {
      const expiringSoon = isMemberExpiringSoon(m);
      return {
        id: m.id,
        primary: m.fullName,
        secondary: [m.membershipPlanName || l3(language, 'Abonnement', 'Plan', 'اشتراك'), m.expirationDate?.slice(0, 10)]
          .filter(Boolean)
          .join(' · '),
        trailing: expiringSoon
          ? l3(language, 'À renouveler', 'Expiring', 'قريب الانتهاء')
          : m.status === 'Active'
          ? l3(language, 'Actif', 'Active', 'نشط')
          : l3(language, 'Expiré', 'Expired', 'منتهي'),
        statusTone: expiringSoon
          ? 'warning'
          : m.status === 'Active'
          ? 'positive'
          : 'danger',
      };
    });
  }, [members, language]);

  const leadRows: HomePreviewRow[] = useMemo(
    () =>
      leads.slice(0, 4).map((l) => ({
        id: l.id,
        primary: l.fullName,
        secondary: [l.preferredPlanName || l.source, l.phoneNumber].filter(Boolean).join(' · '),
        trailing:
          l.status === 'Pending'
            ? l3(language, 'En attente', 'Pending', 'قيد الانتظار')
            : l.status === 'Approved'
            ? l3(language, 'Approuvé', 'Approved', 'مقبول')
            : l3(language, 'Refusé', 'Declined', 'مرفوض'),
        statusTone:
          l.status === 'Pending'
            ? 'warning'
            : l.status === 'Approved'
            ? 'positive'
            : 'danger',
      })),
    [leads, language]
  );

  const dayNames = language === 'ar' ? DAY_NAMES_AR : language === 'fr' ? DAY_NAMES_FR : DAY_NAMES_EN;

  const scheduleRows: HomePreviewRow[] = useMemo(
    () =>
      schedule.slice(0, 3).map((ev) => ({
        id: ev.id,
        primary: ev.title,
        secondary: [ev.trainerOrStaff, dayNames[ev.dayOfWeek] || '', ev.roomOrArea]
          .filter(Boolean)
          .join(' · '),
        trailing: `${ev.startTime} (${ev.enrolledCount}/${ev.capacity})`,
        statusTone: ev.enrolledCount >= ev.capacity ? 'warning' : 'positive',
      })),
    [schedule, dayNames]
  );

  const shopRows: HomePreviewRow[] = useMemo(
    () =>
      products.slice(0, 3).map((p) => {
        const unitPrice = typeof p.price === 'number' ? p.price : p.price?.amount || 0;
        const unitCurrency = typeof p.price === 'number' ? currency : p.price?.currency || currency;
        return {
          id: p.id,
          primary: p.name,
          secondary: [p.category, `${p.stockQuantity} ${l3(language, 'en stock', 'in stock', 'في المخزن')}`]
            .filter(Boolean)
            .join(' · '),
          trailing: formatMoney(unitPrice, unitCurrency),
          statusTone: p.stockQuantity <= p.reorderLevel ? 'warning' : 'neutral',
        };
      }),
    [products, currency, language]
  );

  const staffRows: HomePreviewRow[] = useMemo(
    () =>
      staff.slice(0, 3).map((st) => ({
        id: st.id,
        primary: st.fullName,
        secondary: st.role,
        trailing: st.isClockedInToday
          ? l3(language, 'En poste', 'On shift', 'في الخدمة')
          : l3(language, 'Hors poste', 'Off shift', 'خارج الخدمة'),
        statusTone: st.isClockedInToday ? 'positive' : 'neutral',
      })),
    [staff, language]
  );

  const checkInRows: HomePreviewRow[] = useMemo(
    () =>
      checkIns.slice(0, 3).map((ci) => ({
        id: ci.id,
        primary: ci.memberName,
        secondary: [ci.planName, ci.timestamp?.slice(11, 16)].filter(Boolean).join(' · '),
        trailing:
          ci.accessStatus === 'Granted'
            ? l3(language, 'Autorisé', 'Granted', 'مسموح')
            : ci.accessStatus === 'Warning_Expiring'
            ? l3(language, 'Expire bientôt', 'Expiring', 'ينتهي قريباً')
            : l3(language, 'Alerte', 'Alert', 'تنبيه'),
        statusTone:
          ci.accessStatus === 'Granted'
            ? 'positive'
            : ci.accessStatus === 'Warning_Expiring'
            ? 'warning'
            : 'danger',
      })),
    [checkIns, language]
  );

  const quickActions: HomeQuickAction[] = [
    {
      id: 'add-member',
      label: l3(language, 'Nouvel adhérent', 'New member', 'عضو جديد'),
      icon: <UserPlus size={15} />,
      onClick: () => (onAddMember ? onAddMember() : setScreenAction('members')),
    },
    {
      id: 'add-lead',
      label: l3(language, "Demande d'inscription", 'New inquiry', 'طلب تسجيل'),
      icon: <ClipboardList size={15} />,
      onClick: () => (onAddLead ? onAddLead() : setScreenAction('registrations')),
    },
    {
      id: 'open-scheduler',
      label: l3(language, 'Planning des séances', 'Class schedule', 'جدول الحصص'),
      icon: <Calendar size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
  ];

  // STAFF ROLE HOME
  if (role === 'staff') {
    return (
      <HomeShell
        roleKey="staff"
        quickActions={quickActions.slice(0, 2)}
        dashboardTarget="dashboard"
        dashboardLabel={l3(language, 'Poste Accueil', 'Front Desk Kiosk', 'مكتب الاستقبال')}
        testId="home-membership-staff"
      >
        <HomePodGrid ratio={CATEGORY_HOME_RATIO.membership_session}>
          <DashboardPod
            title={l3(language, 'Poste Réception & Accès', 'Front Desk Gate', 'بوابة الاستقبال')}
            className={HOME_POD_PULSE_CLASS}
          >
            <HomeKioskCard
              config={{
                id: 'gym-front-desk',
                eyebrow: l3(language, 'Poste Actif', 'Live Gate', 'البوابة المباشرة'),
                title: l3(language, 'Contrôle Accès & Pointage', 'Check-in & Walk-ins', 'تسجيل الدخول والزوار'),
                subtitle: l3(
                  language,
                  'Scanner RFID, validation abonnements et accueil instantané.',
                  'RFID gate control, pass checks and instant walk-in pass.',
                  'مراقبة البطاقات والتحقق من الاشتراكات واستقبال الزوار.'
                ),
                ctaLabel: l3(language, 'Ouvrir le Poste', 'Open Front Desk', 'فتح مكتب الاستقبال'),
                icon: <UserCheck size={20} />,
                metricValue: checkIns.length,
                metricLabel: l3(language, 'Passages', 'Check-ins', 'عمليات الدخول'),
                items: checkInRows,
                targetScreen: 'dashboard',
              }}
            />
          </DashboardPod>

          <DashboardPod
            title={l3(language, 'Espaces Autorisés', 'Staff Spaces', 'المساحات المتاحة')}
            className={HOME_POD_DIRECTORY_CLASS}
          >
            <HomeCardsGrid>
              <HomePreviewCard
                config={{
                  id: 'gym-members',
                  tone: 'terracotta',
                  title: l3(language, 'Adhérents', 'Members', 'الأعضاء'),
                  subtitle: l3(language, 'Fiches actives & expirations', 'Active roster & renewals', 'القائمة النشطة والتجديدات'),
                  icon: <Users size={18} />,
                  count: members.length,
                  countLabel: `${activeCount} ${l3(language, 'actifs', 'active', 'نشط')}`,
                  items: memberRows,
                  targetScreen: 'members',
                  emptyTitle: l3(language, 'Aucun adhérent enregistré.', 'No members registered yet.', 'لا يوجد أعضاء مسجلون بعد.'),
                  emptyCtaLabel: l3(language, 'Ajouter un adhérent', 'Add member', 'إضافة عضو'),
                  onEmptyAction: onAddMember,
                }}
              />
              <HomePreviewCard
                config={{
                  id: 'gym-leads',
                  tone: 'lavender',
                  title: l3(language, 'Inscriptions & Essais', 'Registrations & Trials', 'التسجيلات والتجارب'),
                  subtitle: l3(language, "File d'attente d'accueil", 'Pending signups & leads', 'طلبات الانضمام المنتظرة'),
                  icon: <ClipboardList size={18} />,
                  count: leads.length,
                  countLabel: `${pendingLeadsCount} ${l3(language, 'en attente', 'pending', 'قيد الانتظار')}`,
                  items: leadRows,
                  targetScreen: 'registrations',
                  emptyTitle: l3(language, "Aucune demande d'inscription.", 'No pending inquiries.', 'لا توجد طلبات تسجيل.'),
                  emptyCtaLabel: l3(language, 'Créer une demande', 'Add inquiry', 'إضافة طلب'),
                  onEmptyAction: onAddLead,
                }}
              />
            </HomeCardsGrid>
          </DashboardPod>
        </HomePodGrid>
      </HomeShell>
    );
  }

  // OWNER ROLE HOME
  return (
    <HomeShell
      roleKey="owner"
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId="home-membership-owner"
    >
      <HomePodGrid ratio={CATEGORY_HOME_RATIO.membership_session}>
        <DashboardPod
          title={l3(language, 'Pouls & Raccourcis Club', 'Club Pulse & Shortcuts', 'نبض النادي والمساحات')}
          className={HOME_POD_PULSE_CLASS}
        >
          <HomeAnchorCard
            title={l3(language, 'Adhérents Actifs', 'Active Members', 'الأعضاء النشطون')}
            value={activeCount}
            unit={`/ ${members.length}`}
            badgeText={
              expiringCount > 0
                ? `${expiringCount} ${l3(language, 'à renouveler', 'expiring', 'للتجديد')}`
                : l3(language, 'À jour', 'Healthy', 'منتظم')
            }
            badgeVariant={expiringCount > 0 ? 'amber' : 'green'}
            sublabel={l3(
              language,
              'Ouvrir les analyses et le chiffre d’affaires du club',
              'Open club analytics, churn and revenue KPIs',
              'فتح تحليلات النادي ومؤشرات الإيرادات'
            )}
            targetScreen="dashboard"
          />

          <div className="flex-1 min-h-0">
            <HomePreviewCard
              config={{
                id: 'gym-schedule',
                tone: 'brown',
                title: l3(language, 'Planning & Séances', 'Classes & Schedule', 'جدول الحصص'),
                subtitle: l3(language, 'Cours collectifs & salles', 'Weekly sessions & capacity', 'الحصص الجماعية والقاعات'),
                icon: <Calendar size={18} />,
                count: schedule.length,
                countLabel: `${schedule.length} ${l3(language, 'créneaux', 'sessions', 'حصص')}`,
                items: scheduleRows,
                targetScreen: 'scheduler',
                emptyTitle: l3(language, 'Aucune séance planifiée.', 'No scheduled sessions.', 'لا توجد حصص مبرمجة.'),
                emptyCtaLabel: l3(language, 'Planifier', 'Schedule', 'برمجة حصة'),
              }}
            />
          </div>

          <HomeCompactStrip
            config={{
              id: 'gym-staff',
              tone: 'lavender',
              title: l3(language, 'Équipe & Coachs', 'Staff & Coaches', 'الفريق والمدربون'),
              subtitle:
                staffRows.slice(0, 2).map((s) => s.primary).join(' · ') ||
                l3(language, 'Présences et affectations', 'Team roster & shifts', 'أفراد الفريق والحضور'),
              icon: <UserCheck size={17} />,
              count: staff.length,
              statusText: `${staff.filter((s) => s.isClockedInToday).length} ${l3(language, 'en poste', 'on shift', 'في الخدمة')}`,
              targetScreen: 'staff',
            }}
          />
        </DashboardPod>

        <DashboardPod
          title={l3(language, 'Espaces du Club', 'Club Workspaces', 'أقسام النادي')}
          className={HOME_POD_DIRECTORY_CLASS}
        >
          <HomeCardsGrid>
            <HomePreviewCard
              config={{
                id: 'gym-members-main',
                tone: 'terracotta',
                title: l3(language, 'Adhérents & Abonnements', 'Members & Passes', 'الأعضاء والاشتراكات'),
                subtitle: l3(language, 'Renouvellements prioritaires', 'Active roster & renewals', 'القائمة والتجديدات القادمة'),
                icon: <Users size={18} />,
                count: members.length,
                countLabel: `${activeCount} ${l3(language, 'actifs', 'active', 'نشط')}`,
                items: memberRows,
                targetScreen: 'members',
                emptyTitle: l3(language, 'Aucun adhérent enregistré.', 'No members registered.', 'لا يوجد أعضاء بعد.'),
                emptyCtaLabel: l3(language, 'Ajouter un adhérent', 'Add member', 'إضافة عضو'),
                onEmptyAction: onAddMember,
              }}
            />

            <HomePreviewCard
              config={{
                id: 'gym-leads-main',
                tone: 'lavender',
                title: l3(language, 'Inscriptions & Prospects', 'Registrations & Leads', 'طلبات التسجيل'),
                subtitle: l3(language, 'Demandes à convertir', 'Walk-ins & conversions', 'طلبات بانتظار التفعيل'),
                icon: <ClipboardList size={18} />,
                count: leads.length,
                countLabel: `${pendingLeadsCount} ${l3(language, 'en attente', 'pending', 'منتظر')}`,
                items: leadRows,
                targetScreen: 'registrations',
                emptyTitle: l3(language, 'Aucune demande en attente.', 'No inquiries pending.', 'لا توجد طلبات حالية.'),
                emptyCtaLabel: l3(language, 'Nouvelle demande', 'Add inquiry', 'إضافة طلب'),
                onEmptyAction: onAddLead,
              }}
            />

            <HomePreviewCard
              config={{
                id: 'gym-shop-main',
                tone: 'brown',
                title: l3(language, 'Boutique & Produits', 'Club Shop & Merch', 'المتجر والمكملات'),
                subtitle: l3(language, 'Boissons, accessoires & stock', 'Supplements, gear & stock', 'المنتجات والمخزون'),
                icon: <ShoppingBag size={18} />,
                count: products.length,
                countLabel: `${products.filter((p) => p.stockQuantity <= p.reorderLevel).length} ${l3(language, 'alerte stock', 'low stock', 'نقص مخزون')}`,
                items: shopRows,
                targetScreen: 'shop',
                emptyTitle: l3(language, 'Boutique vide.', 'No products listed.', 'المتجر فارغ.'),
                emptyCtaLabel: l3(language, 'Ouvrir boutique', 'Open shop', 'فتح المتجر'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'gym-history-main',
                tone: 'lavender',
                title: l3(language, 'Historique & Passages', 'Check-ins & History', 'سجل الحضور والدخول'),
                subtitle: l3(language, 'Dernières entrées au club', 'Latest gate entries', 'أحدث عمليات الدخول'),
                icon: <History size={18} />,
                count: checkIns.length,
                countLabel: `${checkIns.length} ${l3(language, 'entrées', 'entries', 'عملية دخول')}`,
                items: checkInRows,
                targetScreen: 'history',
                emptyTitle: l3(language, 'Aucun passage récent.', 'No recent check-ins.', 'لا يوجد سجل دخول حديث.'),
                emptyCtaLabel: l3(language, 'Voir historique', 'View history', 'عرض السجل'),
              }}
            />
          </HomeCardsGrid>
        </DashboardPod>
      </HomePodGrid>
    </HomeShell>
  );
};

// ============================================================================
// 2. APPOINTMENT & SALON (appointment_service) — Ratio 42 / 58
// ============================================================================
export const AppointmentHomeView: React.FC<HomeViewProps> = ({ onAddMember }) => {
  const { language } = useTranslation();
  const { role, currency, appointments, members, services, staff } = useAtriumSelector(
    (s) => ({
      role: s.activeAppointmentRole || 'owner',
      currency: 'DZD',
      appointments: selectCurrentAppointmentsFromState(s),
      members: selectCurrentMembersFromState(s),
      services: selectCurrentServicesFromState(s),
      staff: selectCurrentStaffFromState(s),
    }),
    shallowEqualObjects
  );

  const inChairCount = useMemo(
    () => appointments.filter((a) => a.status === 'InChair').length,
    [appointments]
  );

  const apptRows: HomePreviewRow[] = useMemo(
    () =>
      appointments.slice(0, 4).map((a) => ({
        id: a.id,
        primary: `${a.startTime} · ${a.clientName}`,
        secondary: [a.serviceName, a.staffName].filter(Boolean).join(' · '),
        trailing: formatMoney(a.price, currency),
        statusTone:
          a.status === 'InChair'
            ? 'positive'
            : a.status === 'Confirmed' || a.status === 'Booked'
            ? 'warning'
            : 'neutral',
      })),
    [appointments, currency]
  );

  const clientRows: HomePreviewRow[] = useMemo(
    () =>
      members.slice(0, 4).map((m) => ({
        id: m.id,
        primary: m.fullName,
        secondary: [m.phoneNumber, m.lastVisitDate?.slice(0, 10)].filter(Boolean).join(' · '),
        trailing: m.membershipPlanName || l3(language, 'Client', 'Client', 'عميل'),
        statusTone: m.status === 'Active' ? 'positive' : 'neutral',
      })),
    [members, language]
  );

  const serviceRows: HomePreviewRow[] = useMemo(
    () =>
      services.slice(0, 3).map((sv) => ({
        id: sv.id,
        primary: sv.name,
        secondary: [sv.category, `${sv.durationMinutes} min`].join(' · '),
        trailing: formatMoney(sv.price, currency),
        statusTone: 'neutral',
      })),
    [services, currency]
  );

  const staffRows: HomePreviewRow[] = useMemo(
    () =>
      staff.slice(0, 3).map((st) => ({
        id: st.id,
        primary: st.fullName,
        secondary: st.assignedChairOrStudio || st.role,
        trailing: st.isClockedInToday
          ? l3(language, 'Disponible', 'Active', 'متاح')
          : l3(language, 'Repos', 'Off', 'غائب'),
        statusTone: st.isClockedInToday ? 'positive' : 'neutral',
      })),
    [staff, language]
  );

  const quickActions: HomeQuickAction[] = [
    {
      id: 'open-agenda',
      label: l3(language, 'Nouveau rendez-vous', 'Book appointment', 'موعد جديد'),
      icon: <Calendar size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
    {
      id: 'add-client',
      label: l3(language, 'Nouvelle fiche client', 'New client', 'عميل جديد'),
      icon: <UserPlus size={15} />,
      onClick: () => (onAddMember ? onAddMember() : setScreenAction('members')),
    },
    {
      id: 'open-services',
      label: l3(language, 'Carte des soins', 'Service menu', 'قائمة الخدمات'),
      icon: <Scissors size={15} />,
      onClick: () => setScreenAction('shop'),
    },
  ];

  if (role === 'staff') {
    return (
      <HomeShell
        roleKey="staff"
        quickActions={quickActions.slice(0, 2)}
        dashboardTarget="dashboard"
        dashboardLabel={l3(language, 'Poste Fauteuils', 'Chair Station', 'محطة الفوتوي')}
        testId="home-appointment-staff"
      >
        <HomePodGrid ratio={CATEGORY_HOME_RATIO.appointment_service}>
          <DashboardPod
            title={l3(language, 'Poste Fauteuil & Cabine', 'Live Chair Workstation', 'محطة العمل المباشرة')}
            className={HOME_POD_PULSE_CLASS}
          >
            <HomeKioskCard
              config={{
                id: 'salon-chair-kiosk',
                eyebrow: l3(language, 'Poste Praticien', 'Stylist Station', 'محطة المختص'),
                title: l3(language, 'Fauteuils & Encaissement Rapide', 'Quick Chair & Walk-ins', 'إدارة الكراسي والزبائن'),
                subtitle: l3(
                  language,
                  'Lancer une prestation, suivre le fauteuil actif et encaisser.',
                  'Start service timer, track occupied chairs and settle walk-ins.',
                  'بدء الخدمة وتتبع الكراسي المشغولة وتسجيل الدفع السريع.'
                ),
                ctaLabel: l3(language, 'Ouvrir les Fauteuils', 'Open Chair Desk', 'فتح محطة الكراسي'),
                icon: <Scissors size={20} />,
                metricValue: inChairCount,
                metricLabel: l3(language, 'En fauteuil', 'In chair', 'قيد الخدمة'),
                items: apptRows.slice(0, 3),
                targetScreen: 'dashboard',
              }}
            />
          </DashboardPod>

          <DashboardPod
            title={l3(language, 'Agenda & Fichier Clients', 'Agenda & Clients', 'المواعيد والزبائن')}
            className={HOME_POD_DIRECTORY_CLASS}
          >
            <HomeCardsGrid>
              <HomePreviewCard
                config={{
                  id: 'salon-agenda-staff',
                  tone: 'terracotta',
                  title: l3(language, 'Rendez-vous', 'Appointments', 'المواعيد'),
                  subtitle: l3(language, 'Créneaux du jour', 'Upcoming slots', 'مواعيد اليوم'),
                  icon: <Calendar size={18} />,
                  count: appointments.length,
                  countLabel: `${inChairCount} ${l3(language, 'en cours', 'in chair', 'حالي')}`,
                  items: apptRows,
                  targetScreen: 'scheduler',
                  emptyTitle: l3(language, 'Aucun rendez-vous prévu.', 'No appointments booked.', 'لا توجد مواعيد محجوزة.'),
                  emptyCtaLabel: l3(language, 'Voir agenda', 'Open agenda', 'فتح المواعيد'),
                }}
              />
              <HomePreviewCard
                config={{
                  id: 'salon-clients-staff',
                  tone: 'lavender',
                  title: l3(language, 'Clientèle', 'Clients', 'الزبائن'),
                  subtitle: l3(language, 'Historique & formules', 'Client profiles & notes', 'ملفات الزبائن'),
                  icon: <Users size={18} />,
                  count: members.length,
                  countLabel: `${members.length} ${l3(language, 'fiches', 'profiles', 'ملف')}`,
                  items: clientRows,
                  targetScreen: 'members',
                  emptyTitle: l3(language, 'Aucun client enregistré.', 'No clients registered.', 'لا يوجد زبائن بعد.'),
                  emptyCtaLabel: l3(language, 'Ajouter client', 'Add client', 'إضافة زبون'),
                  onEmptyAction: onAddMember,
                }}
              />
            </HomeCardsGrid>
          </DashboardPod>
        </HomePodGrid>
      </HomeShell>
    );
  }

  return (
    <HomeShell
      roleKey="owner"
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId="home-appointment-owner"
    >
      <HomePodGrid ratio={CATEGORY_HOME_RATIO.appointment_service}>
        <DashboardPod
          title={l3(language, 'Activité Cabines & Fauteuils', 'Chair Pulse & Team', 'نبض الصالون والفريق')}
          className={HOME_POD_PULSE_CLASS}
        >
          <HomeAnchorCard
            title={l3(language, 'Rendez-vous Planifiés', 'Booked Appointments', 'المواعيد المحجوزة')}
            value={appointments.length}
            badgeText={`${inChairCount} ${l3(language, 'en cours', 'in chair', 'قيد الخدمة')}`}
            badgeVariant={inChairCount > 0 ? 'orange' : 'green'}
            sublabel={l3(
              language,
              'Accéder au tableau de bord chiffre & occupation',
              'Open utilization, stylist commission and revenue KPIs',
              'فتح مؤشرات الإشغال والعمولات والإيرادات'
            )}
            targetScreen="dashboard"
          />

          <div className="flex-1 min-h-0">
            <HomePreviewCard
              config={{
                id: 'salon-services',
                tone: 'brown',
                title: l3(language, 'Carte des Prestations', 'Service Menu', 'قائمة الخدمات'),
                subtitle: l3(language, 'Tarifs & durées standard', 'Pricing & durations', 'الأسعار والمدد'),
                icon: <Scissors size={18} />,
                count: services.length,
                countLabel: `${services.length} ${l3(language, 'soins', 'services', 'خدمة')}`,
                items: serviceRows,
                targetScreen: 'shop',
                emptyTitle: l3(language, 'Aucune prestation configurée.', 'No services configured.', 'لا توجد خدمات مضافة.'),
                emptyCtaLabel: l3(language, 'Configurer la carte', 'Manage menu', 'إدارة الخدمات'),
              }}
            />
          </div>

          <HomeCompactStrip
            config={{
              id: 'salon-staff',
              tone: 'lavender',
              title: l3(language, 'Équipe & Spécialistes', 'Stylists & Staff', 'الفريق والمختصون'),
              subtitle:
                staffRows.slice(0, 2).map((s) => s.primary).join(' · ') ||
                l3(language, 'Disponibilités & postes', 'Chair assignments', 'توزيع المحطات والحضور'),
              icon: <UserCheck size={17} />,
              count: staff.length,
              statusText: `${staff.filter((s) => s.isClockedInToday).length} ${l3(language, 'présents', 'on floor', 'حاضر')}`,
              targetScreen: 'staff',
            }}
          />
        </DashboardPod>

        <DashboardPod
          title={l3(language, 'Espaces du Salon', 'Salon Workspaces', 'أقسام الصالون')}
          className={HOME_POD_DIRECTORY_CLASS}
        >
          <HomeCardsGrid>
            <HomePreviewCard
              config={{
                id: 'salon-scheduler',
                tone: 'terracotta',
                title: l3(language, 'Agenda & Rendez-vous', 'Agenda & Schedule', 'جدول المواعيد'),
                subtitle: l3(language, 'Créneaux confirmés et en fauteuil', 'Today & upcoming bookings', 'المواعيد القادمة والحالية'),
                icon: <Calendar size={18} />,
                count: appointments.length,
                countLabel: `${appointments.length} ${l3(language, 'créneaux', 'slots', 'مواعيد')}`,
                items: apptRows,
                targetScreen: 'scheduler',
                emptyTitle: l3(language, 'Aucun rendez-vous.', 'No appointments yet.', 'لا توجد مواعيد.'),
                emptyCtaLabel: l3(language, 'Ouvrir agenda', 'Open agenda', 'فتح المواعيد'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'salon-clients',
                tone: 'lavender',
                title: l3(language, 'Fichier Clientèle', 'Client Directory', 'دليل الزبائن'),
                subtitle: l3(language, 'Historique visites & fidélité', 'Client history & formulas', 'سجل الزيارات والتفضيلات'),
                icon: <Users size={18} />,
                count: members.length,
                countLabel: `${members.length} ${l3(language, 'clients', 'clients', 'زبون')}`,
                items: clientRows,
                targetScreen: 'members',
                emptyTitle: l3(language, 'Aucun client enregistré.', 'No clients yet.', 'لا يوجد زبائن بعد.'),
                emptyCtaLabel: l3(language, 'Nouveau client', 'Add client', 'إضافة زبون'),
                onEmptyAction: onAddMember,
              }}
            />

            <HomePreviewCard
              config={{
                id: 'salon-finance',
                tone: 'brown',
                title: l3(language, 'Commissions & Trésorerie', 'Payouts & Finance', 'العمولات والمالية'),
                subtitle: l3(language, 'Partage praticiens & recettes', 'Stylist splits & cash', 'توزيع العمولات والصندوق'),
                icon: <Wallet size={18} />,
                count: appointments.filter((a) => a.isPaid).length,
                countLabel: l3(language, 'Encaissements', 'Settled slots', 'مدفوعة'),
                items: appointments
                  .filter((a) => a.isPaid || a.status === 'Completed')
                  .slice(0, 3)
                  .map((a) => ({
                    id: `fin-${a.id}`,
                    primary: a.clientName,
                    secondary: `${a.staffName} · ${a.serviceName}`,
                    trailing: formatMoney(a.price, currency),
                    statusTone: 'positive',
                  })),
                targetScreen: 'finance',
                emptyTitle: l3(language, 'Aucune transaction finalisée.', 'No settled tickets yet.', 'لا توجد معاملات مسددة.'),
                emptyCtaLabel: l3(language, 'Ouvrir finance', 'Open finance', 'فتح المالية'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'salon-history',
                tone: 'lavender',
                title: l3(language, 'Historique des Soins', 'Visit History', 'سجل الزيارات'),
                subtitle: l3(language, 'Prestations passées & notes', 'Completed sessions', 'الجلسات المكتملة'),
                icon: <History size={18} />,
                count: appointments.filter((a) => a.status === 'Completed').length,
                countLabel: l3(language, 'Terminées', 'Completed', 'مكتملة'),
                items: appointments
                  .filter((a) => a.status === 'Completed')
                  .slice(0, 3)
                  .map((a) => ({
                    id: `hist-${a.id}`,
                    primary: a.serviceName,
                    secondary: `${a.clientName} · ${a.date}`,
                    trailing: a.staffName,
                    statusTone: 'neutral',
                  })),
                targetScreen: 'history',
                emptyTitle: l3(language, 'Aucune visite clôturée.', 'No completed visits yet.', 'لا توجد زيارات منتهية.'),
                emptyCtaLabel: l3(language, 'Voir historique', 'View history', 'عرض السجل'),
              }}
            />
          </HomeCardsGrid>
        </DashboardPod>
      </HomePodGrid>
    </HomeShell>
  );
};

// ============================================================================
// 3. POS & INVENTORY (pos_inventory) — Ratio 40 / 60
// ============================================================================
export const PosHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { role, currency, products, sales, parkedOrders, staff } = useAtriumSelector(
    (s) => ({
      role: s.activePosRole || 'owner',
      currency: 'DZD',
      products: selectCurrentProductsFromState(s),
      sales: selectCurrentSalesFromState(s),
      parkedOrders: selectCurrentParkedOrdersFromState(s),
      staff: selectCurrentStaffFromState(s),
    }),
    shallowEqualObjects
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stockQuantity <= p.reorderLevel),
    [products]
  );

  const totalSalesAmount = useMemo(
    () =>
      sales
        .filter((s) => s.status !== 'Voided' && s.status !== 'Refunded')
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    [sales]
  );

  const saleRows: HomePreviewRow[] = useMemo(
    () =>
      sales.slice(0, 4).map((s) => ({
        id: s.id,
        primary: s.memberName || l3(language, 'Client comptoir', 'Walk-in customer', 'زبون عابر'),
        secondary: [`${s.items?.length || 0} art.`, s.paymentMethod, s.createdAt?.slice(11, 16)]
          .filter(Boolean)
          .join(' · '),
        trailing: formatMoney(s.totalAmount, currency),
        statusTone: s.status === 'Refunded' ? 'danger' : 'positive',
      })),
    [sales, currency, language]
  );

  const stockRows: HomePreviewRow[] = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.stockQuantity - b.stockQuantity);
    return sorted.slice(0, 4).map((p) => ({
      id: p.id,
      primary: p.name,
      secondary: [p.sku, p.category].filter(Boolean).join(' · '),
      trailing: `${p.stockQuantity} ${p.unit || 'u'}`,
      statusTone:
        p.stockQuantity <= 0
          ? 'danger'
          : p.stockQuantity <= p.reorderLevel
          ? 'warning'
          : 'positive',
    }));
  }, [products]);

  const parkedRows: HomePreviewRow[] = useMemo(
    () =>
      parkedOrders.slice(0, 3).map((po) => ({
        id: po.id,
        primary: po.referenceName || po.customerName || l3(language, 'Panier suspendu', 'Parked ticket', 'سلة معلقة'),
        secondary: `${po.items?.length || 0} ${l3(language, 'articles', 'items', 'عناصر')}`,
        trailing: formatMoney(po.totalAmount, currency),
        statusTone: 'warning',
      })),
    [parkedOrders, currency, language]
  );

  const quickActions: HomeQuickAction[] = [
    {
      id: 'open-register',
      label: l3(language, 'Ouvrir la Caisse POS', 'Open POS Register', 'فتح صندوق البيع'),
      icon: <ShoppingBag size={15} />,
      onClick: () => setScreenAction('shop'),
    },
    {
      id: 'open-inventory',
      label: l3(language, 'Contrôler le stock', 'Check inventory', 'مراقبة المخزون'),
      icon: <Boxes size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
    {
      id: 'open-orders',
      label: l3(language, 'Commandes & Tickets', 'Orders & Tickets', 'الطلبات والفواتير'),
      icon: <ClipboardList size={15} />,
      onClick: () => setScreenAction('registrations'),
    },
  ];

  if (role === 'staff') {
    return (
      <HomeShell
        roleKey="staff"
        quickActions={quickActions}
        dashboardTarget="shop"
        dashboardLabel={l3(language, 'Ouvrir la Caisse', 'Open Register', 'فتح الصندوق')}
        testId="home-pos-staff"
      >
        <HomePodGrid ratio={CATEGORY_HOME_RATIO.pos_inventory}>
          <DashboardPod
            title={l3(language, 'Poste Encaissement', 'Cashier Counter', 'نقطة البيع')}
            className={HOME_POD_PULSE_CLASS}
          >
            <HomeKioskCard
              config={{
                id: 'pos-register-kiosk',
                eyebrow: l3(language, 'Caisse Active', 'Active Terminal', 'الصندوق النشط'),
                title: l3(language, 'Terminal Point de Vente', 'Quick Checkout Register', 'محطة البيع السريع'),
                subtitle: l3(
                  language,
                  'Scanner codes-barres, reprendre un panier suspendu et encaisser.',
                  'Scan barcodes, resume parked orders and process payments.',
                  'مسح الباركود واستئناف الطلبات المعلقة وتحصيل المدفوعات.'
                ),
                ctaLabel: l3(language, 'Ouvrir la Caisse', 'Launch Register', 'تشغيل الصندوق'),
                icon: <ShoppingBag size={20} />,
                metricValue: parkedOrders.length,
                metricLabel: l3(language, 'En attente', 'Parked', 'معلقة'),
                items: parkedRows,
                targetScreen: 'shop',
              }}
            />
          </DashboardPod>

          <DashboardPod
            title={l3(language, 'Commandes & Rayon', 'Orders & Shelf Stock', 'الطلبات والمخزون')}
            className={HOME_POD_DIRECTORY_CLASS}
          >
            <HomeCardsGrid>
              <HomePreviewCard
                config={{
                  id: 'pos-orders-staff',
                  tone: 'terracotta',
                  title: l3(language, 'Tickets & Commandes', 'Recent Tickets', 'الطلبات الحديثة'),
                  subtitle: l3(language, 'Ventes du jour', 'Latest completed sales', 'مبيعات اليوم'),
                  icon: <Receipt size={18} />,
                  count: sales.length,
                  countLabel: formatMoney(totalSalesAmount, currency),
                  items: saleRows,
                  targetScreen: 'registrations',
                  emptyTitle: l3(language, 'Aucune vente enregistrée.', 'No sales recorded yet.', 'لا توجد مبيعات بعد.'),
                  emptyCtaLabel: l3(language, 'Nouvelle vente', 'New sale', 'بيع جديد'),
                  onEmptyAction: () => setScreenAction('shop'),
                }}
              />
              <HomePreviewCard
                config={{
                  id: 'pos-stock-staff',
                  tone: 'lavender',
                  title: l3(language, 'État du Stock', 'Inventory Levels', 'حالة المخزون'),
                  subtitle: l3(language, 'Articles sous seuil d’alerte', 'Low stock watch', 'أصناف تحتاج تزويداً'),
                  icon: <Boxes size={18} />,
                  count: products.length,
                  countLabel: `${lowStockProducts.length} ${l3(language, 'critiques', 'low', 'منخفضة')}`,
                  items: stockRows,
                  targetScreen: 'scheduler',
                  emptyTitle: l3(language, 'Catalogue vide.', 'No products in stock.', 'لا توجد منتجات.'),
                  emptyCtaLabel: l3(language, 'Voir stock', 'View inventory', 'عرض المخزون'),
                }}
              />
            </HomeCardsGrid>
          </DashboardPod>
        </HomePodGrid>
      </HomeShell>
    );
  }

  return (
    <HomeShell
      roleKey="owner"
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId="home-pos-owner"
    >
      <HomePodGrid ratio={CATEGORY_HOME_RATIO.pos_inventory}>
        <DashboardPod
          title={l3(language, 'Caisse & Mouvements', 'Register & Queue', 'الصندوق والحركة')}
          className={HOME_POD_PULSE_CLASS}
        >
          <HomeAnchorCard
            title={l3(language, 'Total Encaissements', 'Gross Register Sales', 'إجمالي المبيعات')}
            value={formatMoney(totalSalesAmount, currency)}
            badgeText={`${sales.length} ${l3(language, 'tickets', 'tickets', 'فواتير')}`}
            badgeVariant="orange"
            sublabel={l3(
              language,
              'Ouvrir le tableau analytique des marges et Z de caisse',
              'Open margin analytics, category mix and Z-reports',
              'فتح تحليلات الهوامش وتقارير الصندوق'
            )}
            targetScreen="dashboard"
          />

          <div className="flex-1 min-h-0">
            <HomePreviewCard
              config={{
                id: 'pos-parked',
                tone: 'brown',
                title: l3(language, 'Paniers Suspendus & Caisse', 'Live Register & Parked', 'الصندوق والطلبات المعلقة'),
                subtitle: l3(language, 'Accès rapide au comptoir', 'Instant POS terminal access', 'دخول سريع لنقطة البيع'),
                icon: <ShoppingBag size={18} />,
                count: parkedOrders.length,
                countLabel: `${parkedOrders.length} ${l3(language, 'suspendus', 'parked', 'معلق')}`,
                items: parkedRows,
                targetScreen: 'shop',
                emptyTitle: l3(language, 'Aucun panier en attente.', 'No parked carts right now.', 'لا توجد سلال معلقة.'),
                emptyCtaLabel: l3(language, 'Ouvrir la caisse', 'Open register', 'فتح الصندوق'),
              }}
            />
          </div>
        </DashboardPod>

        <DashboardPod
          title={l3(language, 'Espaces Magasin', 'Store Workspaces', 'أقسام المتجر')}
          className={HOME_POD_DIRECTORY_CLASS}
        >
          <HomeCardsGrid>
            <HomePreviewCard
              config={{
                id: 'pos-inventory',
                tone: 'terracotta',
                title: l3(language, 'Stocks & Réassort', 'Inventory & Alerts', 'المخزون والتنبيهات'),
                subtitle: l3(language, 'Quantités restantes & seuils', 'Stock on hand vs threshold', 'الكميات والحدود الدنيا'),
                icon: <Boxes size={18} />,
                count: products.length,
                countLabel: `${lowStockProducts.length} ${l3(language, 'à réapprovisionner', 'low stock', 'نقص مخزون')}`,
                items: stockRows,
                targetScreen: 'scheduler',
                emptyTitle: l3(language, 'Aucun article référencé.', 'No inventory items yet.', 'لا توجد أصناف.'),
                emptyCtaLabel: l3(language, 'Gérer stock', 'Manage stock', 'إدارة المخزون'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'pos-orders',
                tone: 'lavender',
                title: l3(language, 'Commandes & Ventes', 'Orders & Receipts', 'الطلبات والمبيعات'),
                subtitle: l3(language, 'Derniers tickets émis', 'Most recent checkouts', 'أحدث الفواتير'),
                icon: <ClipboardList size={18} />,
                count: sales.length,
                countLabel: `${sales.length} ${l3(language, 'ventes', 'sales', 'مبيعات')}`,
                items: saleRows,
                targetScreen: 'registrations',
                emptyTitle: l3(language, 'Aucune commande récente.', 'No recent orders.', 'لا توجد طلبات حديثة.'),
                emptyCtaLabel: l3(language, 'Voir commandes', 'View orders', 'عرض الطلبات'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'pos-finance',
                tone: 'brown',
                title: l3(language, 'Trésorerie & Clôture', 'Finance & Z-Close', 'المالية وإغلاق الصندوق'),
                subtitle: l3(language, 'Répartition espèces / cartes', 'Cash drawer & margins', 'تفاصيل الدفع والهوامش'),
                icon: <Wallet size={18} />,
                count: sales.length,
                countLabel: formatMoney(totalSalesAmount, currency),
                items: saleRows.slice(0, 3),
                targetScreen: 'finance',
                emptyTitle: l3(language, 'Aucun encaissement à afficher.', 'No financial entries yet.', 'لا توجد قيود مالية.'),
                emptyCtaLabel: l3(language, 'Ouvrir finance', 'Open finance', 'فتح المالية'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'pos-ledger-staff',
                tone: 'lavender',
                title: l3(language, 'Journal & Équipe Caisse', 'Ledger & Store Team', 'السجل وفريق المتجر'),
                subtitle: l3(language, 'Mouvements & caissiers', 'Audit log & cashiers', 'السجل وأمناء الصندوق'),
                icon: <History size={18} />,
                count: staff.length,
                countLabel: `${staff.filter((s) => s.isClockedInToday).length} ${l3(language, 'en caisse', 'on shift', 'في الخدمة')}`,
                items: staff.slice(0, 3).map((st) => ({
                  id: st.id,
                  primary: st.fullName,
                  secondary: st.assignedRegisterId || st.role,
                  trailing: st.isClockedInToday ? l3(language, 'En poste', 'Active', 'نشط') : l3(language, 'Fermé', 'Off', 'مغلق'),
                  statusTone: st.isClockedInToday ? 'positive' : 'neutral',
                })),
                targetScreen: 'history',
                emptyTitle: l3(language, 'Aucun journal actif.', 'No ledger logs yet.', 'لا توجد سجلات.'),
                emptyCtaLabel: l3(language, 'Ouvrir journal', 'Open ledger', 'فتح السجل'),
              }}
            />
          </HomeCardsGrid>
        </DashboardPod>
      </HomePodGrid>
    </HomeShell>
  );
};

// ============================================================================
// 4. EDUCATION & TRAINING (education_cohort) — Ratio 40 / 60
// ============================================================================
export const EducationHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const {
    role,
    currency,
    students,
    cohorts,
    sessions,
    admissions,
    enrollments,
  } = useAtriumSelector(
    (s) => ({
      role: s.activeEducationRole || 'owner',
      currency: 'DZD',
      students: selectCurrentEduStudentsFromState(s),
      cohorts: selectCurrentEduCohortsFromState(s),
      sessions: selectCurrentEduSessionsFromState(s),
      admissions: selectCurrentEduAdmissionsFromState(s),
      enrollments: selectCurrentEduEnrollmentsFromState(s),
    }),
    shallowEqualObjects
  );

  const outstandingTuition = useMemo(
    () => enrollments.reduce((sum, e) => sum + (e.balanceDue || 0), 0),
    [enrollments]
  );

  const sessionRows: HomePreviewRow[] = useMemo(
    () =>
      sessions.slice(0, 4).map((ses) => ({
        id: ses.id,
        primary: ses.cohortName,
        secondary: [ses.instructorName, ses.classroomName || 'Salle', ses.date].filter(Boolean).join(' · '),
        trailing: `${ses.startTime}–${ses.endTime}`,
        statusTone: ses.status === 'InProgress' ? 'positive' : ses.status === 'Cancelled' ? 'danger' : 'warning',
      })),
    [sessions]
  );

  const studentRows: HomePreviewRow[] = useMemo(
    () =>
      students.slice(0, 4).map((st) => ({
        id: st.id,
        primary: st.fullName,
        secondary: [st.schoolGrade || st.phone, st.attendanceRatePercent !== undefined ? `${st.attendanceRatePercent}%` : '']
          .filter(Boolean)
          .join(' · '),
        trailing: st.status,
        statusTone: st.status === 'Active' ? 'positive' : st.status === 'Suspended' ? 'danger' : 'neutral',
      })),
    [students]
  );

  const cohortRows: HomePreviewRow[] = useMemo(
    () =>
      cohorts.slice(0, 3).map((co) => ({
        id: co.id,
        primary: co.name,
        secondary: [co.courseTitle, co.scheduleSummary].filter(Boolean).join(' · '),
        trailing: `${co.enrolledCount}/${co.maxStudents}`,
        statusTone: co.status === 'InProgress' ? 'positive' : co.status === 'Enrolling' ? 'warning' : 'neutral',
      })),
    [cohorts]
  );

  const admissionRows: HomePreviewRow[] = useMemo(
    () =>
      admissions.slice(0, 3).map((ad) => ({
        id: ad.id,
        primary: ad.studentName,
        secondary: [ad.desiredCourseTitle, ad.phone].filter(Boolean).join(' · '),
        trailing: ad.stage,
        statusTone: ad.stage === 'Admitted' || ad.stage === 'Enrolled' ? 'positive' : ad.stage === 'Declined' ? 'danger' : 'warning',
      })),
    [admissions]
  );

  const quickActions: HomeQuickAction[] = [
    {
      id: 'edu-timetable',
      label: l3(language, 'Emploi du temps', 'Timetable', 'الجدول الزمني'),
      icon: <Calendar size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
    {
      id: 'edu-admissions',
      label: l3(language, 'Nouvelle admission', 'New admission', 'طلب قبول جديد'),
      icon: <ClipboardList size={15} />,
      onClick: () => setScreenAction('registrations'),
    },
    {
      id: 'edu-cohorts',
      label: l3(language, 'Cohortes & Groupes', 'Cohorts & Batches', 'الأفواج والدورات'),
      icon: <GraduationCap size={15} />,
      onClick: () => setScreenAction('shop'),
    },
  ];

  if (role === 'staff') {
    return (
      <HomeShell
        roleKey="staff"
        quickActions={quickActions}
        dashboardTarget="analytics"
        dashboardLabel={l3(language, 'Kiosque Appel', 'Roll Call Kiosk', 'نداء الحضور')}
        testId="home-education-staff"
      >
        <HomePodGrid ratio={CATEGORY_HOME_RATIO.education_cohort}>
          <DashboardPod
            title={l3(language, 'Poste Enseignant', 'Instructor Station', 'محطة الأستاذ')}
            className={HOME_POD_PULSE_CLASS}
          >
            <HomeKioskCard
              config={{
                id: 'edu-rollcall-kiosk',
                eyebrow: l3(language, 'Feuille de Présence', 'Roll Call Live', 'كشف الحضور'),
                title: l3(language, 'Appel & Pointage de Classe', 'Class Roll Call Kiosk', 'تسجيل حضور الطلبة'),
                subtitle: l3(
                  language,
                  'Valider la présence des apprenants et suivre les retards par cohorte.',
                  'Mark attendance, late arrivals and track room sessions.',
                  'تسجيل الحضور والتأخرات ومتابعة حصص الأقسام.'
                ),
                ctaLabel: l3(language, 'Faire l’appel', 'Launch Roll Call', 'فتح نداء الحضور'),
                icon: <Award size={20} />,
                metricValue: sessions.length,
                metricLabel: l3(language, 'Séances', 'Sessions', 'حصص'),
                items: sessionRows.slice(0, 3),
                targetScreen: 'analytics',
              }}
            />
          </DashboardPod>

          <DashboardPod
            title={l3(language, 'Classes & Apprenants', 'Classes & Learners', 'الأفواج والطلبة')}
            className={HOME_POD_DIRECTORY_CLASS}
          >
            <HomeCardsGrid>
              <HomePreviewCard
                config={{
                  id: 'edu-sessions-staff',
                  tone: 'terracotta',
                  title: l3(language, 'Emploi du Temps', 'Timetable', 'جدول الحصص'),
                  subtitle: l3(language, 'Cours programmés', 'Scheduled classes', 'الحصص المبرمجة'),
                  icon: <Calendar size={18} />,
                  count: sessions.length,
                  countLabel: `${sessions.length} ${l3(language, 'cours', 'classes', 'حصص')}`,
                  items: sessionRows,
                  targetScreen: 'scheduler',
                  emptyTitle: l3(language, 'Aucune séance planifiée.', 'No sessions scheduled.', 'لا توجد حصص.'),
                  emptyCtaLabel: l3(language, 'Voir planning', 'View schedule', 'عرض الجدول'),
                }}
              />
              <HomePreviewCard
                config={{
                  id: 'edu-students-staff',
                  tone: 'lavender',
                  title: l3(language, 'Apprenants', 'Students', 'الطلبة'),
                  subtitle: l3(language, 'Assiduité et groupes', 'Active roster', 'القائمة النشطة'),
                  icon: <Users size={18} />,
                  count: students.length,
                  countLabel: `${students.filter((s) => s.status === 'Active').length} ${l3(language, 'actifs', 'active', 'نشط')}`,
                  items: studentRows,
                  targetScreen: 'members',
                  emptyTitle: l3(language, 'Aucun étudiant inscrit.', 'No students enrolled.', 'لا يوجد طلبة.'),
                  emptyCtaLabel: l3(language, 'Voir liste', 'View students', 'عرض الطلبة'),
                }}
              />
            </HomeCardsGrid>
          </DashboardPod>
        </HomePodGrid>
      </HomeShell>
    );
  }

  return (
    <HomeShell
      roleKey="owner"
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId="home-education-owner"
    >
      <HomePodGrid ratio={CATEGORY_HOME_RATIO.education_cohort}>
        <DashboardPod
          title={l3(language, 'Vie Pédagogique', 'Academic Pulse', 'النشاط البيداغوجي')}
          className={HOME_POD_PULSE_CLASS}
        >
          <HomeAnchorCard
            title={l3(language, 'Apprenants Actifs', 'Enrolled Students', 'الطلبة المسجلون')}
            value={students.length}
            badgeText={`${cohorts.length} ${l3(language, 'cohortes', 'cohorts', 'أفواج')}`}
            badgeVariant="orange"
            sublabel={l3(
              language,
              'Ouvrir les indicateurs de scolarité et taux de remplissage',
              'Open tuition recovery, attendance and cohort fill KPIs',
              'فتح مؤشرات التحصيل الدراسي ونسب الامتلاء'
            )}
            targetScreen="dashboard"
          />

          <div className="flex-1 min-h-0">
            <HomePreviewCard
              config={{
                id: 'edu-sessions',
                tone: 'brown',
                title: l3(language, 'Emploi du Temps', 'Timetable & Rooms', 'جدول الحصص والقاعات'),
                subtitle: l3(language, 'Prochaines séances', 'Upcoming class sessions', 'الحصص القادمة'),
                icon: <Calendar size={18} />,
                count: sessions.length,
                countLabel: `${sessions.length} ${l3(language, 'séances', 'sessions', 'حصص')}`,
                items: sessionRows,
                targetScreen: 'scheduler',
                emptyTitle: l3(language, 'Aucune séance planifiée.', 'No sessions yet.', 'لا توجد حصص بعد.'),
                emptyCtaLabel: l3(language, 'Planifier', 'Open timetable', 'فتح الجدول'),
              }}
            />
          </div>
        </DashboardPod>

        <DashboardPod
          title={l3(language, 'Espaces Académie', 'Academy Workspaces', 'أقسام الأكاديمية')}
          className={HOME_POD_DIRECTORY_CLASS}
        >
          <HomeCardsGrid>
            <HomePreviewCard
              config={{
                id: 'edu-students',
                tone: 'terracotta',
                title: l3(language, 'Étudiants & Dossiers', 'Students Roster', 'سجل الطلبة'),
                subtitle: l3(language, 'Profils, tuteurs & assiduité', 'Student files & attendance', 'الملفات والحضور'),
                icon: <Users size={18} />,
                count: students.length,
                countLabel: `${students.filter((s) => s.status === 'Active').length} ${l3(language, 'actifs', 'active', 'نشط')}`,
                items: studentRows,
                targetScreen: 'members',
                emptyTitle: l3(language, 'Aucun apprenant enregistré.', 'No students yet.', 'لا يوجد طلبة مسجلون.'),
                emptyCtaLabel: l3(language, 'Inscrire un élève', 'Add student', 'إضافة طالب'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'edu-cohorts',
                tone: 'lavender',
                title: l3(language, 'Cohortes & Programmes', 'Cohorts & Batches', 'الأفواج والبرامج'),
                subtitle: l3(language, 'Capacité et calendriers', 'Batch capacity & status', 'سعة الأفواج والبرامج'),
                icon: <GraduationCap size={18} />,
                count: cohorts.length,
                countLabel: `${cohorts.filter((c) => c.status === 'InProgress').length} ${l3(language, 'en cours', 'live', 'جارية')}`,
                items: cohortRows,
                targetScreen: 'shop',
                emptyTitle: l3(language, 'Aucune cohorte active.', 'No cohorts created.', 'لا توجد أفواج بعد.'),
                emptyCtaLabel: l3(language, 'Créer cohorte', 'Create cohort', 'إنشاء فوج'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'edu-admissions',
                tone: 'brown',
                title: l3(language, 'Admissions & Tests', 'Admissions Pipeline', 'طلبات التسجيل'),
                subtitle: l3(language, 'Tests de niveau & essais', 'Placements & inquiries', 'اختبارات المستوى والقبول'),
                icon: <ClipboardList size={18} />,
                count: admissions.length,
                countLabel: `${admissions.length} ${l3(language, 'candidats', 'applicants', 'مترشح')}`,
                items: admissionRows,
                targetScreen: 'registrations',
                emptyTitle: l3(language, 'Aucune demande d’admission.', 'No admission leads.', 'لا توجد طلبات قبول.'),
                emptyCtaLabel: l3(language, 'Nouvelle candidature', 'Add applicant', 'إضافة مترشح'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'edu-finance',
                tone: 'lavender',
                title: l3(language, 'Scolarité & Échéances', 'Tuition & Finance', 'الرسوم والأقساط'),
                subtitle: l3(language, 'Reste à recouvrer & paiements', 'Installments & balances', 'الأقساط والمتبقي للتحصيل'),
                icon: <Wallet size={18} />,
                count: formatMoney(outstandingTuition, currency),
                countLabel: l3(language, 'Reste dû', 'Balance due', 'المتبقي'),
                items: enrollments.slice(0, 3).map((en) => ({
                  id: en.id,
                  primary: en.studentName,
                  secondary: en.cohortName,
                  trailing: formatMoney(en.balanceDue, currency),
                  statusTone: en.paymentStatus === 'Paid' ? 'positive' : en.paymentStatus === 'Overdue' ? 'danger' : 'warning',
                })),
                targetScreen: 'finance',
                emptyTitle: l3(language, 'Aucune échéance scolaire.', 'No tuition records.', 'لا توجد سجلات رسوم.'),
                emptyCtaLabel: l3(language, 'Ouvrir finance', 'Open finance', 'فتح المالية'),
              }}
            />
          </HomeCardsGrid>
        </DashboardPod>
      </HomePodGrid>
    </HomeShell>
  );
};
