import React, { useMemo } from 'react';
import {
  Clock,
  Calendar,
  Users,
  Stethoscope,
  FileText,
  CreditCard,
  Wrench,
  Car,
  Boxes,
  Wallet,
  Building2,
  Key,
  FileCheck,
  Factory,
  Layers,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  setScreenAction,
} from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { DashboardPod } from '../../common/dashboard';
import {
  HomeShell,
  HomePodGrid,
  HomePreviewCard,
  HomeKioskCard,
  HomeAnchorCard,
  HomePreviewRow,
  HomeQuickAction,
  CATEGORY_HOME_RATIO,
  l3,
} from '../../common/home';
import { useMedicalData } from '../medical/medicalData';
import { useGarageData } from '../garage/garageData';
import { useRealEstateData } from '../realestate/realEstateData';
import { useManufacturingData } from '../manufacturing/manufacturingData';
import type { HomeViewProps } from './CoreServiceHomeViews';

// ============================================================================
// 9. MEDICAL & CLINIC (medical_clinic) — Ratio 38 / 62
// ============================================================================
export const MedicalHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const currency = 'DZD';

  const {
    patients,
    consultations,
    appointments,
    prescriptions,
    certificates,
    chifaClaims,
    consumables,
    isEmergencyAlarmActive,
  } = useMedicalData();

  const waitingCount = useMemo(
    () =>
      consultations.filter(
        (c) =>
          c.status === 'InWaitingQueue' ||
          c.status === 'TriageNurse' ||
          c.status === 'InConsultation'
      ).length,
    [consultations]
  );

  const queueRows: HomePreviewRow[] = useMemo(
    () =>
      consultations.slice(0, 4).map((c) => ({
        id: c.id,
        primary: `${c.ticketNumber || '#'} · ${c.patientName}`,
        secondary: [c.chiefComplaint, c.doctorName].filter(Boolean).join(' · '),
        trailing: c.ngapCode || formatMoney(c.consultationFeeDzd, currency),
        statusTone:
          c.urgencyLevel === 'Urgence'
            ? 'danger'
            : c.status === 'InConsultation'
            ? 'positive'
            : 'warning',
      })),
    [consultations, currency]
  );

  const agendaRows: HomePreviewRow[] = useMemo(
    () =>
      appointments.slice(0, 3).map((a) => ({
        id: a.id,
        primary: `${a.startTime} · ${a.patientName}`,
        secondary: [a.doctorName, a.reason].filter(Boolean).join(' · '),
        trailing: a.status,
        statusTone: a.status === 'InRoom' || a.status === 'Arrived' ? 'positive' : 'neutral',
      })),
    [appointments]
  );

  const patientRows: HomePreviewRow[] = useMemo(
    () =>
      patients.slice(0, 4).map((p) => ({
        id: p.id,
        primary: p.fullName,
        secondary: [p.phone, p.bloodGroup, p.chifaCardNumber ? 'Chifa' : '']
          .filter(Boolean)
          .join(' · '),
        trailing: p.hasChifa100PercentAld ? '100% ALD' : p.dateOfBirth?.slice(0, 4) || '',
        statusTone: p.hasChifa100PercentAld ? 'warning' : 'neutral',
      })),
    [patients]
  );

  const rxRows: HomePreviewRow[] = useMemo(
    () =>
      prescriptions.slice(0, 3).map((rx) => ({
        id: rx.id,
        primary: rx.patientName,
        secondary: [rx.doctorName || rx.prescribingDoctorName, rx.prescriptionDate].filter(Boolean).join(' · '),
        trailing: `${rx.items?.length || 0} méd.`,
        statusTone: rx.isSigned ? 'positive' : 'warning',
      })),
    [prescriptions]
  );

  const chifaRows: HomePreviewRow[] = useMemo(
    () =>
      chifaClaims.slice(0, 3).map((cl) => ({
        id: cl.id,
        primary: `${cl.patientName} · ${cl.ngapCode}`,
        secondary: cl.bordereauNumber || cl.chifaNumber,
        trailing: formatMoney(cl.totalAmountDzd, currency),
        statusTone: cl.status === 'Reimbursed' ? 'positive' : cl.status === 'Rejected' ? 'danger' : 'warning',
      })),
    [chifaClaims, currency]
  );

  const lowConsumablesCount = useMemo(
    () => consumables.filter((c) => c.currentStock <= c.minStockAlert).length,
    [consumables]
  );

  const quickActions: HomeQuickAction[] = [
    {
      id: 'med-queue',
      label: l3(language, 'Salle d’Attente & Triage', 'Waiting Queue', 'قاعة الانتظار'),
      icon: <Clock size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
    {
      id: 'med-agenda',
      label: l3(language, 'Agenda Médecins', 'Clinic Agenda', 'مواعيد الأطباء'),
      icon: <Calendar size={15} />,
      onClick: () => setScreenAction('agenda'),
    },
    {
      id: 'med-rx',
      label: l3(language, 'Ordonnance & Labo', 'Prescriptions & Lab', 'الوصفات والتحاليل'),
      icon: <Stethoscope size={15} />,
      onClick: () => setScreenAction('shop'),
    },
  ];

  return (
    <HomeShell
      roleKey="owner"
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId="home-medical"
    >
      <HomePodGrid ratio={CATEGORY_HOME_RATIO.medical_clinic}>
        <DashboardPod
          title={l3(language, 'Triage & Urgences', 'Triage & Agenda', 'الفرز والمواعيد')}
        >
          <HomeAnchorCard
            title={l3(language, 'Patients en Attente', 'Active Queue & Triage', 'المرضى في الانتظار')}
            value={waitingCount}
            badgeText={
              isEmergencyAlarmActive
                ? l3(language, 'ALERTE URGENCE', 'EMERGENCY ACTIVE', 'طوارئ نشطة')
                : `${lowConsumablesCount} ${l3(language, 'stocks bas', 'low supplies', 'نقص مستلزمات')}`
            }
            badgeVariant={isEmergencyAlarmActive ? 'red' : 'orange'}
            sublabel={l3(
              language,
              'Ouvrir les indicateurs médicaux, flux NGAP & recettes',
              'Open clinic throughput, Chifa billing and revenue KPIs',
              'فتح مؤشرات العيادة والتسعيرة الطبية'
            )}
            targetScreen="dashboard"
          />

          <HomePreviewCard
            config={{
              id: 'med-agenda',
              title: l3(language, 'Agenda & Rendez-vous', 'Doctor Agenda', 'مواعيد العيادة'),
              subtitle: l3(language, 'Créneaux par praticien & salle', 'Booked slots by doctor', 'المواعيد حسب الطبيب'),
              icon: <Calendar size={18} />,
              count: appointments.length,
              items: agendaRows,
              targetScreen: 'agenda',
              emptyTitle: l3(language, 'Aucun rendez-vous prévu.', 'No appointments scheduled.', 'لا توجد مواعيد.'),
              emptyCtaLabel: l3(language, 'Ouvrir agenda', 'Open agenda', 'فتح المواعيد'),
            }}
          />
        </DashboardPod>

        <DashboardPod title={l3(language, 'Espaces Cliniques', 'Clinical Spaces', 'أقسام العيادة')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HomePreviewCard
              config={{
                id: 'med-queue',
                title: l3(language, 'Salle d’Attente & Consultations', 'Queue & Consultations', 'الانتظار والفحوصات'),
                subtitle: l3(language, 'Tickets de passage & constantes', 'Live patient flow & vitals', 'تدفق المرضى والفرز'),
                icon: <Clock size={18} />,
                count: consultations.length,
                countLabel: `${waitingCount} ${l3(language, 'en attente', 'waiting', 'في الانتظار')}`,
                items: queueRows,
                targetScreen: 'scheduler',
                emptyTitle: l3(language, 'File d’attente vide.', 'Waiting room is empty.', 'قاعة الانتظار فارغة.'),
                emptyCtaLabel: l3(language, 'Ouvrir accueil', 'Open queue', 'فتح الانتظار'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'med-patients',
                title: l3(language, 'Dossiers Patients (DMP)', 'Patient Records', 'ملفات المرضى'),
                subtitle: l3(language, 'Cartes Chifa, ALD & groupes sanguins', 'Chifa cards & vitals history', 'بطاقة الشفاء والسجل الطبي'),
                icon: <Users size={18} />,
                count: patients.length,
                items: patientRows,
                targetScreen: 'members',
                emptyTitle: l3(language, 'Aucun patient enregistré.', 'No patients registered.', 'لا يوجد مرضى.'),
                emptyCtaLabel: l3(language, 'Créer dossier', 'Add patient', 'إضافة مريض'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'med-prescriptions',
                title: l3(language, 'Ordonnances & Labo', 'Prescriptions & Lab', 'الوصفات والتحاليل'),
                subtitle: l3(language, `${certificates.length} certificats médicaux`, `${certificates.length} medical certificates`, `${certificates.length} شهادة طبية`),
                icon: <Stethoscope size={18} />,
                count: prescriptions.length,
                items: rxRows,
                targetScreen: 'shop',
                emptyTitle: l3(language, 'Aucune ordonnance émise.', 'No prescriptions issued.', 'لا توجد وصفات.'),
                emptyCtaLabel: l3(language, 'Nouvelle ordonnance', 'Open prescriptions', 'فتح الوصفات'),
              }}
            />

            <HomePreviewCard
              config={{
                id: 'med-billing',
                title: l3(language, 'Caisse & Bordereaux Chifa', 'Chifa & Clinic Cashier', 'الصندوق وتعويضات الشفاء'),
                subtitle: l3(language, 'Actes NGAP, CNAS & clôture', 'Claims & daily drawer', 'حوالات الضمان الاجتماعي'),
                icon: <CreditCard size={18} />,
                count: chifaClaims.length,
                items: chifaRows,
                targetScreen: 'finance',
                emptyTitle: l3(language, 'Aucun bordereau Chifa.', 'No Chifa claims logged.', 'لا توجد فواتير شفاء.'),
                emptyCtaLabel: l3(language, 'Ouvrir caisse', 'Open billing', 'فتح الفوترة'),
              }}
            />
          </div>
        </DashboardPod>
      </HomePodGrid>
    </HomeShell>
  );
};

// ============================================================================
// 10. AUTO GARAGE & FLEET (auto_garage) — 5 Roles — Ratio 40 / 60
// ============================================================================
export const AutoGarageHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { role, currency } = useAtriumSelector(
    (s) => ({
      role: s.activeGarageRole || 'gerant',
      currency: 'DZD',
    }),
    shallowEqualObjects
  );

  const { orders, vehicles, parts, bays, fleets, invoices } = useGarageData();

  const occupiedBays = useMemo(
    () => bays.filter((b) => b.isOccupied).length,
    [bays]
  );

  const orderRows: HomePreviewRow[] = useMemo(
    () =>
      orders.slice(0, 4).map((o) => ({
        id: o.id,
        primary: `${o.orderNumber} · ${o.vehiclePlate}`,
        secondary: [o.vehicleModel, o.clientName, o.technicianName].filter(Boolean).join(' · '),
        trailing: formatMoney(o.finalCostDzd || o.estimatedCostDzd, currency),
        statusTone: o.status === 'ReadyForPickup' || o.status === 'Delivered' ? 'positive' : o.status === 'WaitingParts' ? 'danger' : 'warning',
      })),
    [orders, currency]
  );

  const vehicleRows: HomePreviewRow[] = useMemo(
    () =>
      vehicles.slice(0, 4).map((v) => ({
        id: v.id,
        primary: `${v.plateNumber} · ${v.brand} ${v.model}`,
        secondary: [v.ownerName, `${v.mileageKm.toLocaleString()} km`].filter(Boolean).join(' · '),
        trailing: v.isFleet ? v.fleetName || 'Flotte' : `${v.year}`,
        statusTone: v.isFleet ? 'warning' : 'neutral',
      })),
    [vehicles]
  );

  const partRows: HomePreviewRow[] = useMemo(
    () =>
      parts.slice(0, 4).map((p) => ({
        id: p.id,
        primary: p.name,
        secondary: [p.sku, p.locationBin].filter(Boolean).join(' · '),
        trailing: `${p.stockQuantity} ${p.unit || 'u'}`,
        statusTone: p.stockQuantity <= p.minThreshold ? 'danger' : 'positive',
      })),
    [parts]
  );

  const invoiceRows: HomePreviewRow[] = useMemo(
    () =>
      invoices.slice(0, 3).map((inv) => ({
        id: inv.id,
        primary: `${inv.invoiceNumber} · ${inv.clientName}`,
        secondary: inv.vehiclePlate,
        trailing: formatMoney(inv.netToPayDzd || inv.totalTtc, currency),
        statusTone: inv.isPaid ? 'positive' : 'warning',
      })),
    [invoices, currency]
  );

  const isTech = role === 'mecanicien';
  const isParts = role === 'magasinier';
  const isCashier = role === 'caisse';
  const isReception = role === 'reception';

  const quickActions: HomeQuickAction[] = [
    {
      id: 'gar-orders',
      label: l3(language, 'Ordres de Réparation (OR)', 'Repair Orders', 'أوامر التصليح'),
      icon: <Wrench size={15} />,
      onClick: () => setScreenAction('scheduler'),
    },
    ...(!isParts
      ? [
          {
            id: 'gar-vehicles',
            label: l3(language, 'Parc Véhicules & Flottes', 'Vehicles & Fleets', 'المركبات والأساطيل'),
            icon: <Car size={15} />,
            onClick: () => setScreenAction('members'),
          },
        ]
      : []),
    {
      id: 'gar-parts',
      label: l3(language, 'Magasin Pièces Détachées', 'Spare Parts Depot', 'مخزن قطع الغيار'),
      icon: <Boxes size={15} />,
      onClick: () => setScreenAction('shop'),
    },
  ];

  const primaryScreen = isTech || isReception ? ('scheduler' as const) : isParts ? ('shop' as const) : isCashier ? ('finance' as const) : ('dashboard' as const);

  return (
    <HomeShell
      roleKey={role}
      quickActions={quickActions}
      dashboardTarget={role === 'gerant' || isReception || isCashier ? 'dashboard' : primaryScreen}
      dashboardLabel={
        isTech
          ? l3(language, 'Poste Ponts', 'Bay Kanban', 'أرصفة العمل')
          : isParts
          ? l3(language, 'Magasin Pièces', 'Parts Queue', 'قطع الغيار')
          : undefined
      }
      testId={`home-garage-${role}`}
    >
      <HomePodGrid ratio={CATEGORY_HOME_RATIO.auto_garage}>
        <DashboardPod title={l3(language, 'Ponts & Activité Atelier', 'Lifts & Workshop Pulse', 'أرصفة العمل والنشاط')}
        >
          <HomeAnchorCard
            title={l3(language, 'Ponts Occupés', 'Occupied Workshop Bays', 'الأرصفة المشغولة')}
            value={`${occupiedBays}/${bays.length}`}
            badgeText={`${orders.filter((o) => o.status === 'InRepair' || o.status === 'Diagnostic').length} ${l3(language, 'en cours', 'active OR', 'قيد الإصلاح')}`}
            badgeVariant="orange"
            sublabel={
              isTech || isParts
                ? l3(language, 'Accéder directement à votre poste atelier', 'Launch your operational workstation', 'فتح محطة عملك المباشرة')
                : l3(language, 'Ouvrir les indicateurs atelier, main-d’œuvre & DGI', 'Open garage throughput, bay utilization & billing KPIs', 'فتح لوحة تحكم الورشة والفوترة')
            }
            targetScreen={primaryScreen}
          />

          <HomePreviewCard
            config={{
              id: 'gar-bays',
              title: l3(language, 'État des Ponts & Flottes', 'Workshop Bays Status', 'حالة الأرصفة والأساطيل'),
              subtitle: l3(language, `${fleets.length} comptes flottes B2B`, `${fleets.length} corporate fleet accounts`, `${fleets.length} أساطيل شركات`),
              icon: <Wrench size={18} />,
              count: bays.length,
              items: bays.slice(0, 3).map((b) => ({
                id: b.id,
                primary: b.name,
                secondary: b.assignedTechnicianName || b.bayType,
                trailing: b.isOccupied ? l3(language, 'Occupé', 'Busy', 'مشغول') : l3(language, 'Libre', 'Free', 'متاح'),
                statusTone: b.isOccupied ? 'warning' : 'positive',
              })),
              targetScreen: 'scheduler',
              emptyTitle: l3(language, 'Aucun pont configuré.', 'No workshop bays listed.', 'لا توجد أرصفة.'),
              emptyCtaLabel: l3(language, 'Ouvrir ponts', 'Open bays', 'فتح الأرصفة'),
            }}
          />
        </DashboardPod>

        <DashboardPod title={l3(language, 'Espaces Atelier Auto', 'Garage Workspaces', 'أقسام الورشة')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HomePreviewCard
              config={{
                id: 'gar-orders',
                title: l3(language, 'Ordres de Réparation (OR)', 'Repair Orders', 'أوامر التصليح'),
                subtitle: l3(language, 'Réception, diagnostic & travaux', 'Active jobs & handovers', 'الاستقبال والفحص والتنفيذ'),
                icon: <Wrench size={18} />,
                count: orders.length,
                items: orderRows,
                targetScreen: 'scheduler',
                emptyTitle: l3(language, 'Aucun ordre de réparation.', 'No repair orders open.', 'لا توجد أوامر تصليح.'),
                emptyCtaLabel: l3(language, 'Nouvel OR', 'Open orders', 'فتح الأوامر'),
              }}
            />

            {!isParts && (
              <HomePreviewCard
                config={{
                  id: 'gar-vehicles',
                  title: l3(language, 'Véhicules & Cartes Grises', 'Vehicle Registry', 'سجل المركبات'),
                  subtitle: l3(language, 'Kilométrages, VIN & historiques', 'Plates, VINs & owners', 'اللوحات والعدادات والملاك'),
                  icon: <Car size={18} />,
                  count: vehicles.length,
                  items: vehicleRows,
                  targetScreen: 'members',
                  emptyTitle: l3(language, 'Aucun véhicule référencé.', 'No vehicles registered.', 'لا توجد مركبات.'),
                  emptyCtaLabel: l3(language, 'Ajouter véhicule', 'Open vehicles', 'عرض المركبات'),
                }}
              />
            )}

            <HomePreviewCard
              config={{
                id: 'gar-parts',
                title: l3(language, 'Magasin Pièces Détachées', 'Spare Parts Inventory', 'مخزن قطع الغيار'),
                subtitle: l3(language, 'Références OEM & alertes rupture', 'Stock bins & thresholds', 'المخزون وحدود التنبيه'),
                icon: <Boxes size={18} />,
                count: parts.length,
                countLabel: `${parts.filter((p) => p.stockQuantity <= p.minThreshold).length} ${l3(language, 'critiques', 'low', 'منخفضة')}`,
                items: partRows,
                targetScreen: 'shop',
                emptyTitle: l3(language, 'Aucune pièce en stock.', 'No spare parts listed.', 'المخزن فارغ.'),
                emptyCtaLabel: l3(language, 'Gérer pièces', 'Open parts', 'فتح المخزن'),
              }}
            />

            {!isTech && !isParts && (
              <HomePreviewCard
                config={{
                  id: 'gar-billing',
                  title: l3(language, 'Facturation DGI & Caisse', 'Billing & Fleet Ledger', 'الفوترة والصندوق'),
                  subtitle: l3(language, 'Factures TVA 19% + Timbre fiscal', 'Invoices & settlements', 'الفواتير الضريبية والتحصيل'),
                  icon: <Wallet size={18} />,
                  count: invoices.length,
                  items: invoiceRows,
                  targetScreen: 'finance',
                  emptyTitle: l3(language, 'Aucune facture émise.', 'No invoices issued yet.', 'لا توجد فواتير.'),
                  emptyCtaLabel: l3(language, 'Ouvrir caisse', 'Open billing', 'فتح الفوترة'),
                }}
              />
            )}
          </div>
        </DashboardPod>
      </HomePodGrid>
    </HomeShell>
  );
};

// ============================================================================
// 11. REAL ESTATE AGENCY (real_estate) — 4 Roles — Ratio 42 / 58
// ============================================================================
export const RealEstateHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { role, currency } = useAtriumSelector(
    (s) => ({
      role: s.activeRealEstateRole || 'direction',
      currency: 'DZD',
    }),
    shallowEqualObjects
  );

  const { properties, mandates, leases, quittances, visits, inspections } = useRealEstateData();

  const totalRentRoll = useMemo(
    () => leases.filter((l) => l.status === 'Active').reduce((sum, l) => sum + (l.monthlyRentDzd || 0), 0),
    [leases]
  );

  const mandateRows: HomePreviewRow[] = useMemo(
    () =>
      mandates.slice(0, 4).map((m) => ({
        id: m.id,
        primary: `${m.mandateNumber} · ${m.propertyTitle}`,
        secondary: [m.ownerFullName, m.isExclusive ? 'Exclusif' : 'Simple'].join(' · '),
        trailing: formatMoney(m.askingPriceDzd, currency),
        statusTone: m.status === 'Active' ? 'positive' : m.status === 'Expiring' ? 'warning' : 'neutral',
      })),
    [mandates, currency]
  );

  const propertyRows: HomePreviewRow[] = useMemo(
    () =>
      properties.slice(0, 4).map((p) => ({
        id: p.id,
        primary: p.title,
        secondary: [p.cityWilaya, `${p.surfaceM2} m²`, p.listingType].join(' · '),
        trailing: formatMoney(p.priceDzd, currency),
        statusTone: p.status === 'Available' ? 'positive' : 'neutral',
      })),
    [properties, currency]
  );

  const leaseRows: HomePreviewRow[] = useMemo(
    () =>
      leases.slice(0, 4).map((l) => ({
        id: l.id,
        primary: `${l.propertyTitle} · ${l.tenantName}`,
        secondary: l.endDate,
        trailing: `${formatMoney(l.monthlyRentDzd, currency)}/m`,
        statusTone: (l.arrearsDzd || 0) > 0 ? 'danger' : 'positive',
      })),
    [leases, currency]
  );

  const visitRows: HomePreviewRow[] = useMemo(
    () =>
      visits.slice(0, 3).map((v) => ({
        id: v.id,
        primary: `${v.clientFullName} · ${v.propertyTitle}`,
        secondary: [v.negotiatorName, v.visitTimestamp?.slice(0, 10)].filter(Boolean).join(' · '),
        trailing: v.clientImpression || 'Visite',
        statusTone: v.clientImpression === 'OfferSubmitted' || v.clientImpression === 'Interested' ? 'positive' : 'neutral',
      })),
    [visits]
  );

  const quittanceRows: HomePreviewRow[] = useMemo(
    () =>
      quittances.slice(0, 3).map((q) => ({
        id: q.id,
        primary: `${q.quittanceNumber} · ${q.tenantName}`,
        secondary: `${q.propertyTitle} · ${q.periodMonth}/${q.periodYear}`,
        trailing: formatMoney(q.totalCollectedDzd, currency),
        statusTone: q.isDisbursedToOwner ? 'positive' : 'warning',
      })),
    [quittances, currency]
  );

  const isNegociateur = role === 'negociateur';
  const isLocatif = role === 'gestionnaire_locatif';
  const isNotaireCompta = role === 'notaire_compta';

  const quickActions: HomeQuickAction[] = [
    ...(!isLocatif
      ? [
          {
            id: 're-mandates',
            label: l3(language, 'Mandats Décret 09-18', 'Mandates Registry', 'الوكالات العقارية'),
            icon: <FileText size={15} />,
            onClick: () => setScreenAction('realestate_mandates'),
          },
        ]
      : []),
    ...(!isNotaireCompta
      ? [
          {
            id: 're-properties',
            label: l3(language, 'Portefeuille Biens & Titres', 'Properties Portfolio', 'محفظة العقارات'),
            icon: <Building2 size={15} />,
            onClick: () => setScreenAction('members'),
          },
        ]
      : []),
    ...(!isNegociateur
      ? [
          {
            id: 're-leases',
            label: l3(language, 'Contrats & Baux', 'Leases & Renewals', 'عقود الكراء'),
            icon: <Key size={15} />,
            onClick: () => setScreenAction('scheduler'),
          },
        ]
      : []),
  ];

  return (
    <HomeShell
      roleKey={role}
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId={`home-realestate-${role}`}
    >
      <HomePodGrid ratio={CATEGORY_HOME_RATIO.real_estate}>
        <DashboardPod title={l3(language, 'Portefeuille & Loyers', 'Portfolio Anchor', 'مؤشرات الوكالة')}
        >
          <HomeAnchorCard
            title={
              isNegociateur
                ? l3(language, 'Mandats Actifs 09-18', 'Active Sales Mandates', 'الوكالات النشطة')
                : l3(language, 'Loyers Mensuels Actifs', 'Monthly Lease Roll', 'إجمالي الإيجارات الشهرية')
            }
            value={isNegociateur ? mandates.length : formatMoney(totalRentRoll, currency)}
            badgeText={`${properties.length} ${l3(language, 'biens', 'properties', 'عقار')}`}
            badgeVariant="orange"
            sublabel={l3(
              language,
              'Ouvrir le tableau de bord immobilier & commissions',
              'Open brokerage pipeline, lease occupancy & commissions',
              'فتح لوحة قيادة الوكالة والعمولات'
            )}
            targetScreen="dashboard"
          />

          <HomePreviewCard
            config={{
              id: 're-side-activity',
              title: isLocatif
                ? l3(language, 'États des Lieux', 'Property Inspections', 'معاينة العقارات')
                : l3(language, 'Bons de Visite GPS', 'Signed Visit Slips', 'وصولات الزيارة'),
              subtitle: isLocatif
                ? l3(language, `${inspections.length} états entrée/sortie`, `${inspections.length} check-in/out logs`, `${inspections.length} محاضر معاينة`)
                : l3(language, 'Comptes-rendus terrain', 'Client visits & offers', 'تقييمات الزوار والعروض'),
              icon: <FileCheck size={18} />,
              count: isLocatif ? inspections.length : visits.length,
              items: isLocatif
                ? inspections.slice(0, 3).map((ins) => ({
                    id: ins.id,
                    primary: ins.propertyTitle,
                    secondary: `${ins.inspectionDate} · ${ins.generalCondition}`,
                    trailing: ins.isSigned ? l3(language, 'Signé', 'Signed', 'موقع') : l3(language, 'Brouillon', 'Draft', 'مسودة'),
                    statusTone: ins.isSigned ? 'positive' : 'warning',
                  }))
                : visitRows,
              targetScreen: isNotaireCompta ? 'finance' : 'registrations',
              emptyTitle: l3(language, 'Aucune visite récente.', 'No recent visits logged.', 'لا توجد زيارات.'),
              emptyCtaLabel: l3(language, 'Voir suivi', 'Open view', 'عرض القائمة'),
            }}
          />
        </DashboardPod>

        <DashboardPod title={l3(language, 'Espaces Agence Immobilière', 'Real Estate Spaces', 'أقسام الوكالة')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isLocatif && (
              <HomePreviewCard
                config={{
                  id: 're-mandates',
                  title: l3(language, 'Mandats Décret 09-18', 'Sales Mandates', 'الوكالات القانونية'),
                  subtitle: l3(language, 'Exclusivités & barèmes commission', 'Mandates & terms', 'الحصرية والعمولات'),
                  icon: <FileText size={18} />,
                  count: mandates.length,
                  items: mandateRows,
                  targetScreen: 'realestate_mandates',
                  emptyTitle: l3(language, 'Aucun mandat enregistré.', 'No mandates registered.', 'لا توجد وكالات.'),
                  emptyCtaLabel: l3(language, 'Nouveau mandat', 'Add mandate', 'إضافة وكالة'),
                }}
              />
            )}

            {!isNotaireCompta && (
              <HomePreviewCard
                config={{
                  id: 're-properties',
                  title: l3(language, 'Biens & Livrets Fonciers', 'Properties & Titles', 'العقارات والدفاتر العقارية'),
                  subtitle: l3(language, 'Catalogue vente & location', 'Available portfolio', 'عروض البيع والكراء'),
                  icon: <Building2 size={18} />,
                  count: properties.length,
                  items: propertyRows,
                  targetScreen: 'members',
                  emptyTitle: l3(language, 'Aucun bien répertorié.', 'No properties listed.', 'لا توجد عقارات.'),
                  emptyCtaLabel: l3(language, 'Ajouter bien', 'Add property', 'إضافة عقار'),
                }}
              />
            )}

            {!isNegociateur && (
              <HomePreviewCard
                config={{
                  id: 're-leases',
                  title: l3(language, 'Baux & Locations', 'Active Leases', 'عقود الإيجار'),
                  subtitle: l3(language, 'Échéances & arriérés', 'Tenants & renewals', 'المستأجرون والمستحقات'),
                  icon: <Key size={18} />,
                  count: leases.length,
                  items: leaseRows,
                  targetScreen: 'scheduler',
                  emptyTitle: l3(language, 'Aucun bail actif.', 'No active leases.', 'لا توجد عقود إيجار.'),
                  emptyCtaLabel: l3(language, 'Créer bail', 'Open leases', 'فتح العقود'),
                }}
              />
            )}

            {!isNegociateur && (
              <HomePreviewCard
                config={{
                  id: 're-finance',
                  title: l3(language, 'Quittances & Règlements', 'Receipts & Owner Payouts', 'الوصولات وتسوية الملاك'),
                  subtitle: l3(language, 'Quittances Art. 317 & virements', 'Rent collection ledger', 'تحصيل الإيجارات والحسابات'),
                  icon: <Wallet size={18} />,
                  count: quittances.length,
                  items: quittanceRows,
                  targetScreen: 'finance',
                  emptyTitle: l3(language, 'Aucune quittance émise.', 'No rent receipts issued.', 'لا توجد وصولات.'),
                  emptyCtaLabel: l3(language, 'Ouvrir caisse', 'Open finance', 'فتح المالية'),
                }}
              />
            )}
          </div>
        </DashboardPod>
      </HomePodGrid>
    </HomeShell>
  );
};

// ============================================================================
// 12. MANUFACTURING & PRODUCTION (manufacturing_production) — 5 Roles — 36 / 64
// ============================================================================
export const ManufacturingHomeView: React.FC<HomeViewProps> = () => {
  const { language } = useTranslation();
  const { role, currency } = useAtriumSelector(
    (s) => ({
      role: s.activeManufacturingRole || 'gerant',
      currency: 'DZD',
    }),
    shallowEqualObjects
  );

  const { boms, orders, materials, vouchers, qcRecords } = useManufacturingData();

  const activeOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'InProduction' || o.status === 'MaterialsIssued' || o.status === 'QC').length,
    [orders]
  );

  const lowMaterialsCount = useMemo(
    () => materials.filter((m) => m.availableStock <= m.reorderThreshold).length,
    [materials]
  );

  const orderRows: HomePreviewRow[] = useMemo(
    () =>
      orders.slice(0, 4).map((o) => ({
        id: o.id,
        primary: `${o.orderNumber} · ${o.productName}`,
        secondary: [`${o.actualQuantityProduced || 0}/${o.targetQuantity}`, o.dueDate].join(' · '),
        trailing: o.status,
        statusTone: o.status === 'Completed' ? 'positive' : o.status === 'QC' || o.status === 'QC_Pending' ? 'warning' : 'neutral',
      })),
    [orders]
  );

  const bomRows: HomePreviewRow[] = useMemo(
    () =>
      boms.slice(0, 3).map((b) => ({
        id: b.id,
        primary: `${b.bomCode} · ${b.finishedProductName}`,
        secondary: `${b.components.length} comp. · ${b.batchYield} ${b.unit}`,
        trailing: formatMoney(b.estimatedCostDzd, currency),
        statusTone: b.isActive ? 'positive' : 'neutral',
      })),
    [boms, currency]
  );

  const materialRows: HomePreviewRow[] = useMemo(
    () =>
      materials.slice(0, 4).map((m) => ({
        id: m.id,
        primary: m.name,
        secondary: [m.sku, m.warehouseLocation].filter(Boolean).join(' · '),
        trailing: `${m.availableStock} ${m.unit}`,
        statusTone: m.availableStock <= m.reorderThreshold ? 'danger' : 'positive',
      })),
    [materials]
  );

  const qcRows: HomePreviewRow[] = useMemo(
    () =>
      qcRecords.slice(0, 4).map((q) => ({
        id: q.id,
        primary: `${q.inspectionNumber} · ${q.productName}`,
        secondary: [q.orderNumber, `Lot ${q.batchLotNumber}`].join(' · '),
        trailing: `${q.acceptedQuantity}/${q.inspectedQuantity}`,
        statusTone: q.verdict === 'Accepted' ? 'positive' : q.verdict === 'Quarantined' || q.verdict === 'Scrapped' ? 'danger' : 'warning',
      })),
    [qcRecords]
  );

  // OPERATOR KIOSK ROLE
  if (role === 'operateur') {
    return (
      <HomeShell
        roleKey="operateur"
        quickActions={[
          {
            id: 'mfg-station',
            label: l3(language, 'Poste Machine Tactile', 'Open Machine Station', 'محطة الآلة'),
            icon: <Factory size={15} />,
            onClick: () => setScreenAction('dashboard'),
          },
          {
            id: 'mfg-tasks',
            label: l3(language, 'Mes Ordres OF', 'Assigned Orders', 'أوامر التصنيع'),
            icon: <Layers size={15} />,
            onClick: () => setScreenAction('scheduler'),
          },
        ]}
        dashboardTarget="dashboard"
        dashboardLabel={l3(language, 'Ouvrir Poste Machine', 'Open Station', 'فتح محطة الآلة')}
        testId="home-manufacturing-operateur"
      >
        <HomePodGrid ratio={CATEGORY_HOME_RATIO.manufacturing_production}>
          <DashboardPod title={l3(language, 'Poste Opérateur Tablette', 'Machine Workstation', 'محطة العامل')}
          >
            <HomeKioskCard
              config={{
                id: 'mfg-workstation-kiosk',
                eyebrow: l3(language, 'Ligne Active', 'Shop Floor Live', 'الخط النشط'),
                title: l3(language, 'Chrono Poste & Déclaration Pièces', 'Run Timer & Scrap Declaration', 'تسجيل الإنتاج والقطع التالفة'),
                subtitle: l3(
                  language,
                  'Pointer sur votre ordre de fabrication et déclarer les quantités conformes.',
                  'Clock into your workstation batch and record good units and scrap.',
                  'تسجيل وقت التشغيل والكميات المنتجة والتالفة.'
                ),
                ctaLabel: l3(language, 'Ouvrir la Station', 'Launch Workstation', 'فتح محطة العمل'),
                icon: <Factory size={20} />,
                metricValue: activeOrdersCount,
                metricLabel: l3(language, 'OF actifs', 'Live OFs', 'أوامر جارية'),
                items: orderRows.slice(0, 3),
                targetScreen: 'dashboard',
              }}
            />
          </DashboardPod>

          <DashboardPod title={l3(language, 'Ordres Assignés', 'Assigned Fabrication Orders', 'الأوامر الموكلة')}
          >
            <HomePreviewCard
              config={{
                id: 'mfg-op-orders',
                title: l3(language, 'Ordres de Fabrication (OF)', 'Production Orders', 'أوامر التصنيع'),
                subtitle: l3(language, 'Lots & objectifs de cadence', 'Target quantities & due dates', 'الكميات المستهدفة'),
                icon: <Factory size={18} />,
                count: orders.length,
                items: orderRows,
                targetScreen: 'scheduler',
                emptyTitle: l3(language, 'Aucun ordre de fabrication.', 'No orders assigned.', 'لا توجد أوامر.'),
                emptyCtaLabel: l3(language, 'Voir file', 'Open orders', 'عرض الأوامر'),
              }}
            />
          </DashboardPod>
        </HomePodGrid>
      </HomeShell>
    );
  }

  const isStorekeeper = role === 'magasinier';
  const isQuality = role === 'qualite';

  const quickActions: HomeQuickAction[] = [
    ...(!isStorekeeper
      ? [
          {
            id: 'mfg-of',
            label: l3(language, 'Ordres de Fabrication (OF)', 'Production Orders', 'أوامر التصنيع'),
            icon: <Factory size={15} />,
            onClick: () => setScreenAction('scheduler'),
          },
        ]
      : []),
    ...(!isQuality
      ? [
          {
            id: 'mfg-materials',
            label: l3(language, 'Matières Premières & BSM', 'Raw Materials', 'المواد الأولية'),
            icon: <Boxes size={15} />,
            onClick: () => setScreenAction('members'),
          },
        ]
      : []),
    ...(role !== 'magasinier'
      ? [
          {
            id: 'mfg-qc',
            label: l3(language, 'Contrôle Qualité & Lots', 'Quality Control', 'مراقبة الجودة'),
            icon: <ShieldCheck size={15} />,
            onClick: () => setScreenAction('finance'),
          },
        ]
      : []),
  ];

  return (
    <HomeShell
      roleKey={role}
      quickActions={quickActions}
      dashboardTarget="dashboard"
      testId={`home-manufacturing-${role}`}
    >
      <HomePodGrid ratio={CATEGORY_HOME_RATIO.manufacturing_production}>
        <DashboardPod title={l3(language, 'Cadence & Alertes Usine', 'Plant Floor Pulse', 'نبض المصنع')}
        >
          <HomeAnchorCard
            title={
              isStorekeeper
                ? l3(language, 'Matières Sous Seuil', 'Low Stock Materials', 'مواد قاربت النفاد')
                : isQuality
                ? l3(language, 'Contrôles Qualité', 'QC Inspections', 'فحوصات الجودة')
                : l3(language, 'OF en Production', 'Active Work Orders', 'أوامر التصنيع النشطة')
            }
            value={isStorekeeper ? lowMaterialsCount : isQuality ? qcRecords.length : activeOrdersCount}
            badgeText={`${boms.length} BOM · ${vouchers.length} BSM`}
            badgeVariant={lowMaterialsCount > 0 ? 'amber' : 'green'}
            sublabel={l3(
              language,
              'Ouvrir le tableau de bord TRS, coûts de revient & rebuts',
              'Open plant efficiency, unit cost & scrap KPIs',
              'فتح لوحة قيادة المصنع والتكاليف'
            )}
            targetScreen="dashboard"
          />

          <HomePreviewCard
            config={{
              id: 'mfg-boms',
              title: isQuality
                ? l3(language, 'Lots en Quarantaine', 'Quarantined & Alert Batches', 'الدفعات المحجوزة')
                : l3(language, 'Nomenclatures (BOM)', 'Recipes & BOMs', 'وصفات التصنيع'),
              subtitle: isQuality
                ? l3(language, 'Lots nécessitant arbitrage ONML', 'Batches under review', 'تحت المراقبة')
                : l3(language, 'Coûts matières & gamme opératoire', 'Standard component trees', 'المكونات والتكلفة المقدرة'),
              icon: isQuality ? <AlertTriangle size={18} /> : <Layers size={18} />,
              count: isQuality ? qcRecords.length : boms.length,
              items: isQuality ? qcRows.slice(0, 3) : bomRows,
              targetScreen: isQuality ? 'finance' : 'shop',
              emptyTitle: l3(language, 'Aucune fiche enregistrée.', 'No entries yet.', 'لا توجد بيانات.'),
              emptyCtaLabel: l3(language, 'Ouvrir module', 'Open module', 'فتح القسم'),
            }}
          />
        </DashboardPod>

        <DashboardPod title={l3(language, 'Espaces Atelier & Stock', 'Factory Spaces', 'أقسام المصنع')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isStorekeeper && (
              <HomePreviewCard
                config={{
                  id: 'mfg-orders',
                  title: l3(language, 'Ordres de Fabrication (OF)', 'Production Orders', 'أوامر التصنيع'),
                  subtitle: l3(language, 'Lancement, cadences & clôture lots', 'Batch targets & stations', 'المراحل والكميات'),
                  icon: <Factory size={18} />,
                  count: orders.length,
                  items: orderRows,
                  targetScreen: 'scheduler',
                  emptyTitle: l3(language, 'Aucun OF planifié.', 'No production orders.', 'لا توجد أوامر تصنيع.'),
                  emptyCtaLabel: l3(language, 'Lancer un OF', 'Create order', 'إنشاء أمر'),
                }}
              />
            )}

            {!isQuality && (
              <HomePreviewCard
                config={{
                  id: 'mfg-materials',
                  title: l3(language, 'Matières Premières & BSM', 'Raw Materials & Issues', 'المواد الأولية والمخزن'),
                  subtitle: l3(language, 'Stocks PMP, réservations & bons', 'Available vs allocated', 'المتاح والمخصص'),
                  icon: <Boxes size={18} />,
                  count: materials.length,
                  countLabel: `${lowMaterialsCount} ${l3(language, 'alertes', 'alerts', 'تنبيهات')}`,
                  items: materialRows,
                  targetScreen: 'members',
                  emptyTitle: l3(language, 'Magasin matières vide.', 'No raw materials yet.', 'لا توجد مواد أولية.'),
                  emptyCtaLabel: l3(language, 'Ouvrir magasin', 'Open depot', 'فتح المخزن'),
                }}
              />
            )}

            {!isStorekeeper && !isQuality && (
              <HomePreviewCard
                config={{
                  id: 'mfg-bom-card',
                  title: l3(language, 'Recettes & Gammes BOM', 'Bills of Materials', 'المقاييس والوصفات'),
                  subtitle: l3(language, 'Coût de revient & rendements', 'Component breakdowns', 'المكونات والتكاليف'),
                  icon: <Layers size={18} />,
                  count: boms.length,
                  items: bomRows,
                  targetScreen: 'shop',
                  emptyTitle: l3(language, 'Aucune nomenclature.', 'No BOMs created.', 'لا توجد وصفات.'),
                  emptyCtaLabel: l3(language, 'Créer BOM', 'Open BOMs', 'فتح الوصفات'),
                }}
              />
            )}

            {!isStorekeeper && (
              <HomePreviewCard
                config={{
                  id: 'mfg-qc',
                  title: l3(language, 'Contrôle Qualité & Certificats', 'Quality Control & Metrology', 'مراقبة الجودة'),
                  subtitle: l3(language, 'Échantillonnage, conformité & rebuts', 'Lot verdicts & ONML', 'نتائج الفحص والمطابقة'),
                  icon: <ShieldCheck size={18} />,
                  count: qcRecords.length,
                  items: qcRows,
                  targetScreen: 'finance',
                  emptyTitle: l3(language, 'Aucun contrôle enregistré.', 'No QC inspections yet.', 'لا توجد فحوصات.'),
                  emptyCtaLabel: l3(language, 'Ouvrir QC', 'Open QC', 'فتح الجودة'),
                }}
              />
            )}
          </div>
        </DashboardPod>
      </HomePodGrid>
    </HomeShell>
  );
};
