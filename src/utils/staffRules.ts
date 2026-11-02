import { StaffMember, BusinessCategory } from '../types/index';
import { validateCcpAccount } from './algerianPtt';
import { calculateCcpKey } from './logisticsRules';

export interface StaffValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Normalizes phone numbers by stripping whitespace, dashes, plus signs, and parentheses.
 */
export function normalizePhone(phone: string): string {
  return (phone || '').replace(/[\s\-\(\)\+]/g, '');
}

/**
 * Checks if a staff member is the sole active Owner in the facility/business.
 */
export function isSoleActiveOwner(staffId: string, staffList: StaffMember[]): boolean {
  const target = staffList.find((s) => s.id === staffId);
  if (!target) return false;

  const isOwner =
    (target.role || '').toLowerCase() === 'owner' ||
    target.roleRank === 8;

  if (!isOwner) return false;

  const otherActiveOwners = staffList.filter((s) => {
    if (s.id === staffId) return false;
    const sIsOwner = (s.role || '').toLowerCase() === 'owner' || s.roleRank === 8;
    const sIsActive = s.isActive && s.status !== 'terminated';
    return sIsOwner && sIsActive;
  });

  return otherActiveOwners.length === 0;
}

/**
 * Validates staff credentials (email, phone, PIN, RFID card, CCP) ensuring uniqueness and regulatory conformity.
 */
export function validateStaffCredentials(
  data: Partial<StaffMember>,
  existingStaff: StaffMember[],
  excludeId?: string
): StaffValidationResult {
  const errors: Record<string, string> = {};
  const otherStaff = existingStaff.filter((s) => s.id !== excludeId);

  // 1. Full Name
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.fullName = 'Le nom complet est obligatoire (min 2 caractères).';
  }

  // 2. Email validation & uniqueness
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Format d\'adresse email invalide.';
  } else {
    const cleanEmail = data.email.trim().toLowerCase();
    const emailConflict = otherStaff.some((s) => (s.email || '').toLowerCase() === cleanEmail);
    if (emailConflict) {
      errors.email = 'Cette adresse email est déjà attribuée à un autre collaborateur.';
    }
  }

  // 3. Phone validation & uniqueness
  if (!data.phoneNumber || data.phoneNumber.trim().length < 8) {
    errors.phoneNumber = 'Numéro de téléphone requis (ex: 0550 12 34 56).';
  } else {
    const norm = normalizePhone(data.phoneNumber);
    const phoneConflict = otherStaff.some((s) => normalizePhone(s.phoneNumber) === norm);
    if (phoneConflict) {
      errors.phoneNumber = 'Ce numéro de téléphone est déjà utilisé par un autre collaborateur.';
    }
  }

  // 4. PIN Code validation (4 digits) & uniqueness
  if (data.canLoginPin || data.pinCode) {
    if (!data.pinCode || !/^\d{4}$/.test(data.pinCode.trim())) {
      errors.pinCode = 'Le code PIN doit comporter exactement 4 chiffres.';
    } else {
      const pin = data.pinCode.trim();
      const pinConflict = otherStaff.some((s) => s.pinCode === pin);
      if (pinConflict) {
        errors.pinCode = 'Ce code PIN à 4 chiffres est déjà attribué.';
      }
    }
  }

  // 5. RFID / Card ID uniqueness
  if (data.cardId && data.cardId.trim().length > 0) {
    const card = data.cardId.trim().toUpperCase();
    const cardConflict = otherStaff.some((s) => (s.cardId || '').toUpperCase() === card);
    if (cardConflict) {
      errors.cardId = 'Ce badge RFID / NFC / QR est déjà associé à un autre membre.';
    }
  }

  // 6. Payment method & CCP validation
  if (data.paymentMethod === 'ccp' || data.ccpNumber) {
    if (!data.ccpNumber || data.ccpNumber.trim().length === 0) {
      errors.ccpNumber = 'Le numéro de compte CCP est requis pour ce mode de règlement.';
    } else {
      const cleanAccount = data.ccpNumber.replace(/\D/g, '');
      if (!cleanAccount || cleanAccount.length < 3) {
        errors.ccpNumber = 'Le numéro de compte CCP est invalide.';
      } else if (data.ccpKey !== undefined && data.ccpKey.trim().length > 0) {
        const expectedKey = String(calculateCcpKey(cleanAccount)).padStart(2, '0');
        const providedKey = data.ccpKey.trim().padStart(2, '0');
        if (providedKey !== expectedKey) {
          errors.ccpKey = `Clé CCP invalide (Clé calculée: ${expectedKey}).`;
        }
      }
    }
  }

  // 7. Salary payment day clamping (1 - 31)
  if (data.paymentDay !== undefined && (data.paymentDay < 1 || data.paymentDay > 31)) {
    errors.paymentDay = 'Le jour de paie doit être compris entre 1 et 31.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Strict RBAC Access Check for Staff & Workforce Screen.
 * 
 * - Dual-role categories (Gym, Salon, Retail POS, Education, Freelance):
 *   ONLY the Owner is allowed to see the screen and create/manage staff.
 * 
 * - Multi-role categories (BTP, Medical, Agency, Garage, Logistics, Manufacturing, Legal, Agriculture, Trading, Real Estate):
 *   Owner AND team-management operational roles are authorized to access and manage staff.
 */
export function canAccessStaffScreen(category: BusinessCategory | string, userRole: string | undefined): boolean {
  if (!userRole) return false;
  const role = userRole.toLowerCase().trim();

  // Owners always have full access across every single category
  if (role === 'owner' || role === 'gerant' || role === 'directeur_general' || role === 'admin') {
    return true;
  }

  // Simple Dual-Role Categories: ONLY the Owner can access! Regular staff/cashiers are locked out.
  const dualRoleCategories = [
    'membership_session',
    'appointment_service',
    'pos_inventory',
    'education_cohort',
    'freelance_solo',
  ];

  if (dualRoleCategories.includes(category)) {
    return false;
  }

  // Multi-Role Categories: Team management roles can also access
  const authorizedManagementRolesByCategory: Record<string, string[]> = {
    project_milestone: ['manager', 'agencydirector', 'projectmanager', 'directeur_agence', 'chef_projet'],
    medical_clinic: ['manager', 'doctor', 'medecinchef', 'medecin_chef', 'cadre_sante', 'surveillant_general'],
    auto_garage: ['manager', 'chefatelier', 'chef_atelier', 'responsable_service'],
    real_estate: ['manager', 'director', 'directeur_agence', 'directeur_commercial'],
    manufacturing_production: ['manager', 'productionmanager', 'chefproduction', 'responsable_production', 'chef_atelier'],
    legal_notary: ['partner', 'associate', 'avocat_associe', 'premier_clerc'],
    logistics_delivery: ['manager', 'fleetmanager', 'dispatcher', 'responsable_flotte', 'chef_quai'],
    construction_contractor: ['manager', 'conducteurtravaux', 'chefchantier', 'conducteur_travaux', 'chef_chantier'],
    agriculture_livestock: ['manager', 'chefexploitation', 'chefculture', 'chef_exploitation', 'chef_culture', 'regisseur'],
    trading_commercial: ['manager', 'directeurcommercial', 'directeur_commercial', 'responsable_depot', 'chef_ventes'],
    rental_booking: ['manager', 'regisseur_general', 'coordinateur_site'],
  };

  const allowedRoles = authorizedManagementRolesByCategory[category] || ['manager'];
  return allowedRoles.some((r) => role.includes(r));
}

/**
 * Checks if the current viewer is authorized to create or edit staff members.
 * Enforces owner-only authority in simple dual-role categories, and allows operational team leads in multi-role categories.
 */
export function canCreateStaff(category: BusinessCategory | string, userRole: string | undefined): boolean {
  if (!userRole) return false;
  const role = userRole.toLowerCase().trim();

  // Owners, Gerants, and Admins always have creation authority
  if (role === 'owner' || role === 'gerant' || role === 'directeur_general' || role === 'admin') {
    return true;
  }

  // Simple Dual-Role Categories: ONLY the Owner can create/edit staff
  const dualRoleCategories = [
    'membership_session',
    'appointment_service',
    'pos_inventory',
    'education_cohort',
    'freelance_solo',
  ];

  if (dualRoleCategories.includes(category)) {
    return false;
  }

  // Multi-Role Categories: Specific management roles authorized to create/edit staff
  const authorizedCreationRolesByCategory: Record<string, string[]> = {
    project_milestone: ['manager', 'agencydirector', 'projectmanager', 'directeur_agence', 'chef_projet', 'direction'],
    medical_clinic: ['manager', 'doctor', 'medecinchef', 'medecin_chef'],
    auto_garage: ['manager', 'chefatelier', 'chef_atelier'],
    real_estate: ['manager', 'director', 'directeur_agence', 'directeur_commercial', 'direction'],
    manufacturing_production: ['manager', 'productionmanager', 'chefproduction', 'responsable_production', 'chef_atelier'],
    legal_notary: ['partner', 'associate', 'avocat_associe'],
    logistics_delivery: ['manager', 'fleetmanager', 'dispatcher', 'responsable_flotte', 'chef_quai'],
    construction_contractor: ['manager', 'conducteurtravaux', 'conducteur_travaux', 'conducteur'],
    agriculture_livestock: ['manager', 'chefexploitation', 'chefculture', 'chef_exploitation', 'chef_culture', 'regisseur'],
    trading_commercial: ['manager', 'directeurcommercial', 'directeur_commercial'],
    rental_booking: ['manager', 'regisseur_general'],
  };

  const allowed = authorizedCreationRolesByCategory[category] || [];
  return allowed.some((r) => role.includes(r));
}

/**
 * Resolves the effective active user role by taking into account category-specific switcher states.
 */
export function getEffectiveUserRole(
  category: BusinessCategory | string,
  state: {
    currentUser?: { role?: string } | null;
    activePmRole?: string;
    activeGarageRole?: string;
    activeRealEstateRole?: string;
    activeManufacturingRole?: string;
    activeLegalRole?: string;
    activeLogisticsRole?: string;
    activeContractorRole?: string;
    activeAgriRole?: string;
    activeMembershipRole?: string;
    activeAppointmentRole?: string;
    activePosRole?: string;
    activeEducationRole?: string;
  }
): string {
  switch (category) {
    case 'membership_session':
      return state.activeMembershipRole === 'staff' ? 'Staff' : (state.currentUser?.role || 'Owner');
    case 'appointment_service':
      return state.activeAppointmentRole === 'staff' ? 'Staff' : (state.currentUser?.role || 'Owner');
    case 'pos_inventory':
      return state.activePosRole === 'staff' ? 'Staff' : (state.currentUser?.role || 'Owner');
    case 'education_cohort':
      return state.activeEducationRole === 'staff' ? 'Staff' : (state.currentUser?.role || 'Owner');
    case 'freelance_solo':
      return state.currentUser?.role || 'Owner';
    case 'auto_garage':
      return state.activeGarageRole || state.currentUser?.role || 'gerant';
    case 'construction_contractor':
      return state.activeContractorRole || state.currentUser?.role || 'gerant';
    case 'logistics_delivery':
      return state.activeLogisticsRole || state.currentUser?.role || 'gerant';
    case 'manufacturing_production':
      return state.activeManufacturingRole || state.currentUser?.role || 'gerant';
    case 'agriculture_livestock':
      return state.activeAgriRole || state.currentUser?.role || 'gerant';
    case 'legal_notary':
      return state.activeLegalRole || state.currentUser?.role || 'avocat_associe';
    case 'real_estate':
      return state.activeRealEstateRole || state.currentUser?.role || 'direction';
    case 'project_milestone':
      return state.activePmRole || state.currentUser?.role || 'direction';
    default:
      return state.currentUser?.role || 'Owner';
  }
}

/**
 * Checks if the current viewer is authorized to view confidential compensation and bank data (Salary, CCP).
 * Redacted for team managers/leads — visible only to Facility Owners.
 */
export function canViewSensitivePayroll(userRole: string | undefined): boolean {
  if (!userRole) return false;
  const role = userRole.toLowerCase().trim();
  return role === 'owner' || role === 'gerant' || role === 'directeur_general' || role === 'admin';
}

/**
 * Category-specific performance score presets and labels.
 */
export function getCategoryPerformanceMetricLabel(category: BusinessCategory | string): {
  labelFr: string;
  labelEn: string;
  labelAr: string;
  unit: string;
} {
  switch (category) {
    case 'medical_clinic':
      return { labelFr: 'Consultations / Semaine', labelEn: 'Consultations / Week', labelAr: 'استشارات / أسبوع', unit: 'consult.' };
    case 'auto_garage':
      return { labelFr: 'Ordres de Réparation Clôturés', labelEn: 'Closed Repair Orders', labelAr: 'أوامر تصليح منجزة', unit: 'OR' };
    case 'construction_contractor':
      return { labelFr: 'Jalons Chantier & Sécurité', labelEn: 'Site Milestones & Safety', labelAr: 'معالم الورشة والسلامة', unit: '%' };
    case 'logistics_delivery':
      return { labelFr: 'Taux de Livraison Réussie', labelEn: 'Delivery Success Rate', labelAr: 'نسبة نجاح التوصيل', unit: '%' };
    case 'manufacturing_production':
      return { labelFr: 'Rendement Postes & OEE', labelEn: 'OEE Station Efficiency', labelAr: 'مردودية المحطة والجودة', unit: '%' };
    case 'trading_commercial':
      return { labelFr: 'Objectif Ventes & Encaissement', labelEn: 'Sales & Collection Target', labelAr: 'هدف المبيعات والتحصيل', unit: 'DZD' };
    case 'real_estate':
      return { labelFr: 'Mandats Actifs & Visites', labelEn: 'Active Mandates & Visits', labelAr: 'تفويضات نشطة وزيارات', unit: 'mandats' };
    case 'project_milestone':
      return { labelFr: 'Livrables BAT Conformes', labelEn: 'Approved BAT Deliverables', labelAr: 'تسليمات مطابقة', unit: 'BAT' };
    case 'appointment_service':
      return { labelFr: 'Prestations & Soins Terminés', labelEn: 'Completed Stylist Services', labelAr: 'خدمات مصفف مكتملة', unit: 'soins' };
    case 'education_cohort':
      return { labelFr: 'Heures d\'Enseignement & Présence', labelEn: 'Teaching Hours & Attendance', labelAr: 'ساعات التدريس والحضور', unit: 'h' };
    case 'agriculture_livestock':
      return { labelFr: 'Parcelles Traitées / Rendement', labelEn: 'Treated Parcels / Yield', labelAr: 'مردودية القطع المعالجة', unit: 'ha' };
    case 'legal_notary':
      return { labelFr: 'Actes & Audiences Clôturées', labelEn: 'Closed Deeds & Hearings', labelAr: 'عقود وجلسات منجزة', unit: 'actes' };
    case 'pos_inventory':
      return { labelFr: 'Tickets Encaissés / Heure', labelEn: 'Transactions / Hour', labelAr: 'عمليات دفع / ساعة', unit: 'tkt/h' };
    case 'membership_session':
    default:
      return { labelFr: 'Séances Coachées & Assiduité', labelEn: 'Coached Sessions & Presence', labelAr: 'حصص تدريبية وحضور', unit: 'séances' };
  }
}
