import { BusinessCategory, SupportedLanguage } from '../../../types/index';
import type { HomeColumnRatio } from './homeTypes';

export function l3(
  language: SupportedLanguage,
  fr: string,
  en: string,
  ar: string
): string {
  return language === 'ar' ? ar : language === 'fr' ? fr : en;
}

export function getTimeGreeting(language: SupportedLanguage, hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) {
    return l3(language, 'Bonjour', 'Good morning', 'صباح الخير');
  }
  if (hour >= 12 && hour < 18) {
    return l3(language, 'Bon après-midi', 'Good afternoon', 'مساء الخير');
  }
  return l3(language, 'Bonsoir', 'Good evening', 'مساء النور');
}

export function extractFirstName(fullName?: string): string {
  if (!fullName) return '';
  const cleaned = fullName.trim();
  if (!cleaned) return '';
  return cleaned.split(/\s+/)[0] || cleaned;
}

export const CATEGORY_HOME_RATIO: Record<BusinessCategory, HomeColumnRatio> = {
  membership_session: '38_62',
  appointment_service: '42_58',
  pos_inventory: '40_60',
  project_milestone: '42_58',
  rental_booking: '40_60',
  education_cohort: '40_60',
  freelance_solo: '40_60',
  trading_commercial: '45_55',
  medical_clinic: '38_62',
  auto_garage: '40_60',
  real_estate: '42_58',
  manufacturing_production: '36_64',
  legal_accounting: '42_58',
  logistics_delivery: '44_56',
  construction_contractor: '44_56',
  agriculture_farming: '58_42',
};

export function getCategoryHomeTitle(
  category: BusinessCategory | string | undefined,
  language: SupportedLanguage
): string {
  switch (category) {
    case 'membership_session':
      return l3(language, 'Accueil du Club', 'Club Reception', 'استقبال النادي');
    case 'appointment_service':
      return l3(language, 'Accueil Salon & Cabines', 'Salon Reception', 'استقبال الصالون');
    case 'pos_inventory':
      return l3(language, 'Accueil Boutique & Caisse', 'Store & Register Hub', 'مركز المتجر والصندوق');
    case 'project_milestone':
      return l3(language, 'Hall Agence & Opérations', 'Agency Operations Hall', 'بهو الوكالة والعمليات');
    case 'rental_booking':
      return l3(language, 'Accueil Espaces & Locations', 'Venue & Rentals Hall', 'استقبال القاعات والتأجير');
    case 'education_cohort':
      return l3(language, 'Accueil Académie', 'Academy Reception', 'استقبال الأكاديمية');
    case 'freelance_solo':
      return l3(language, 'Atelier Solo', 'Solo Studio Hub', 'مكتب العمل الحر');
    case 'trading_commercial':
      return l3(language, 'Centre Négoce B2B', 'B2B Trading Desk', 'مركز التجارة والجملة');
    case 'medical_clinic':
      return l3(language, 'Accueil Clinique', 'Clinic Reception', 'استقبال العيادة');
    case 'auto_garage':
      return l3(language, 'Accueil Atelier Auto', 'Garage Reception', 'استقبال الورشة');
    case 'real_estate':
      return l3(language, 'Hall Agence Immobilière', 'Real Estate Lobby', 'بهو الوكالة العقارية');
    case 'manufacturing_production':
      return l3(language, 'Poste Central Usine', 'Factory Floor Hub', 'مركز المصنع والإنتاج');
    case 'legal_accounting':
      return l3(language, 'Étude & Cabinet', 'Practice Reception', 'استقبال المكتب القانوني');
    case 'logistics_delivery':
      return l3(language, 'Tour de Contrôle Hub', 'Dispatch Control Hub', 'مركز التوزيع والتوصيل');
    case 'construction_contractor':
      return l3(language, 'Bureau Technique Chantiers', 'Site Operations Hub', 'مكتب متابعة الورشات');
    case 'agriculture_farming':
      return l3(language, 'Domaine & Campagne', 'Estate Operations Hub', 'إدارة المزرعة والمحاصيل');
    default:
      return l3(language, "Salle d'Accueil", 'Reception Hub', 'قاعة الاستقبال');
  }
}

export function getHomeRoleDisplayLabel(
  category: BusinessCategory | string | undefined,
  role: string,
  language: SupportedLanguage
): string {
  const key = `${category || ''}:${role}`;
  switch (key) {
    case 'membership_session:owner':
    case 'appointment_service:owner':
    case 'pos_inventory:owner':
    case 'education_cohort:owner':
      return l3(language, 'Propriétaire / Direction', 'Owner', 'المالك');
    case 'membership_session:staff':
      return l3(language, 'Réception & Accueil', 'Front Desk Staff', 'موظف الاستقبال');
    case 'appointment_service:staff':
      return l3(language, 'Praticien / Poste', 'Stylist & Chair', 'الحلاق / المختص');
    case 'pos_inventory:staff':
      return l3(language, 'Caissier / Vendeur', 'Cashier & Floor', 'أمين الصندوق');
    case 'education_cohort:staff':
      return l3(language, 'Enseignant / Appel', 'Instructor', 'الأستاذ / المكون');
    case 'project_milestone:direction':
      return l3(language, 'Direction Générale', 'Executive Direction', 'الإدارة العامة');
    case 'project_milestone:chef_projet':
      return l3(language, 'Chef de Projet', 'Project Manager', 'رئيس المشروع');
    case 'project_milestone:crea':
      return l3(language, 'Studio Créa', 'Creative Studio', 'استوديو التصميم');
    case 'project_milestone:superviseur':
      return l3(language, 'Superviseur Terrain', 'Field Supervisor', 'المشرف الميداني');
    case 'project_milestone:rh':
      return l3(language, 'Ressources Humaines', 'Talent & HR', 'الموارد البشرية');
    case 'project_milestone:compta':
      return l3(language, 'Comptabilité & CCP', 'Accounting & Payroll', 'المحاسبة والمالية');
    case 'auto_garage:gerant':
      return l3(language, 'Gérant Garage', 'Garage Manager', 'مدير الورشة');
    case 'auto_garage:reception':
      return l3(language, 'Réception Atelier', 'Service Advisor', 'مستقبل المركبات');
    case 'auto_garage:mecanicien':
      return l3(language, 'Mécanicien', 'Technician', 'الميكانيكي');
    case 'auto_garage:magasinier':
      return l3(language, 'Magasinier Pièces', 'Parts Clerk', 'أمين قطع الغيار');
    case 'auto_garage:caisse':
      return l3(language, 'Caisse & Facturation', 'Billing & Cashier', 'الصندوق والفوترة');
    case 'real_estate:direction':
      return l3(language, 'Direction Agence', 'Agency Director', 'مدير الوكالة');
    case 'real_estate:negociateur':
      return l3(language, 'Négociateur', 'Sales Negotiator', 'الوسيط العقاري');
    case 'real_estate:gestionnaire_locatif':
      return l3(language, 'Gestionnaire Locatif', 'Property Manager', 'مسير الإيجارات');
    case 'real_estate:notaire_compta':
      return l3(language, 'Comptabilité & Actes', 'Closing & Accounts', 'المحاسبة والعقود');
    case 'manufacturing_production:gerant':
      return l3(language, 'Directeur Production', 'Plant Manager', 'مدير المصنع');
    case 'manufacturing_production:chef_atelier':
      return l3(language, "Chef d'Atelier", 'Floor Supervisor', 'رئيس الورشة');
    case 'manufacturing_production:operateur':
      return l3(language, 'Opérateur Machine', 'Line Operator', 'عامل الآلة');
    case 'manufacturing_production:magasinier':
      return l3(language, 'Magasinier Matières', 'Materials Clerk', 'أمين المخزن');
    case 'manufacturing_production:qualite':
      return l3(language, 'Contrôle Qualité', 'Quality Inspector', 'مراقب الجودة');
    case 'legal_accounting:avocat_associe':
      return l3(language, 'Avocat Associé', 'Managing Partner', 'محامٍ شريك');
    case 'legal_accounting:notaire_titulaire':
      return l3(language, 'Notaire Titulaire', 'Notary Public', 'موثق رسمي');
    case 'legal_accounting:expert_comptable':
      return l3(language, 'Expert-Comptable', 'Chartered Accountant', 'محاسب معتمد');
    case 'legal_accounting:secretaire_caisse':
      return l3(language, 'Secrétariat & Caisse', 'Clerk & Cashier', 'الأمانة والصندوق');
    case 'logistics_delivery:gerant':
      return l3(language, 'Gérant Réseau', 'Network Manager', 'مدير الشبكة');
    case 'logistics_delivery:dispatcher':
      return l3(language, 'Dispatcheur', 'Dispatcher', 'موزع المسارات');
    case 'logistics_delivery:hub_sorter':
      return l3(language, 'Agent Tri & Scan', 'Hub Sorter', 'عامل الفرز');
    case 'logistics_delivery:stop_desk_agent':
      return l3(language, 'Agent Stop-Desk', 'Stop-Desk Agent', 'عون نقطة الاستلام');
    case 'construction_contractor:gerant':
      return l3(language, 'Gérant Entreprise BTP', 'Contractor Director', 'مدير المقاولة');
    case 'construction_contractor:conducteur':
    case 'construction_contractor:conducteur_travaux':
      return l3(language, 'Conducteur Travaux', 'Site Engineer', 'مهندس الأشغال');
    case 'construction_contractor:chef_chantier':
      return l3(language, 'Chef de Chantier', 'Site Foreman', 'رئيس الورشة');
    case 'construction_contractor:metreur':
    case 'construction_contractor:daf_metreur':
      return l3(language, 'Métreur / Études', 'Quantity Surveyor', 'المقياس والدراسات');
    case 'construction_contractor:comptable':
      return l3(language, 'Comptable Chantiers', 'Project Accountant', 'محاسب الورشات');
    case 'agriculture_farming:gerant':
      return l3(language, 'Exploitant Agricole', 'Farm Manager', 'مسير المزرعة');
    case 'agriculture_farming:chef_culture':
      return l3(language, 'Chef de Culture', 'Agronomist Lead', 'رئيس الزراعة');
    case 'agriculture_farming:zootechnicien':
      return l3(language, 'Zootechnicien', 'Livestock Lead', 'مختص تربية المواشي');
    case 'agriculture_farming:magasinier':
      return l3(language, 'Magasinier & Bascule', 'Depot & Weighbridge', 'أمين الميزان والمخزن');
    default:
      return l3(language, 'Espace Actif', 'Active Workspace', 'مساحة العمل');
  }
}

export const getHomeStrings = (language: SupportedLanguage) => ({
  dashboardCta: l3(language, 'Tableau de bord', 'Dashboard', 'لوحة القيادة'),
  quickActions: l3(language, 'Actions rapides', 'Quick actions', 'إجراءات سريعة'),
  viewAll: l3(language, 'Tout voir', 'View all', 'عرض الكل'),
  openModule: l3(language, 'Ouvrir', 'Open', 'فتح'),
  liveDirectoryPod: l3(language, 'Espaces directs', 'Direct spaces', 'المساحات المباشرة'),
  operationsPod: l3(language, 'Activité en direct', 'Live operations', 'النشاط المباشر'),
  todayPulse: l3(language, 'Aperçu du jour', 'Today snapshot', 'ملخص اليوم'),
  noItemsYet: l3(language, 'Aucun élément actif pour le moment.', 'No active items yet.', 'لا توجد عناصر نشطة حالياً.'),
});
