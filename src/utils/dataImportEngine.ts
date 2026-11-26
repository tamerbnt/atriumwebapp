import { unzipSync, strFromU8 } from 'fflate';
import {
  normalizeAlgerianPhoneForCrm,
  normalizeEmail,
  normalizeNif,
} from './crmPartyEngine';
import type {
  ImportDelimiter,
  ImportDuplicatePolicy,
  ImportEncoding,
  ImportEntityType,
  ImportRowError,
} from '../types/index';

// ============================================================================
// SCHEMA DEFINITIONS FOR ALL 10 REQUIRED ENTITY TARGETS (SECTION 6.7)
// ============================================================================

export type ImportFieldKind = 'text' | 'number' | 'integer' | 'date' | 'phone' | 'email' | 'nif';

export interface ImportEntityFieldSchema {
  key: string;
  labelEn: string;
  labelFr: string;
  labelAr: string;
  required?: boolean;
  uniqueCandidate?: boolean;
  kind: ImportFieldKind;
  aliases: string[];
}

export interface ImportEntitySchema {
  entityType: ImportEntityType;
  labelEn: string;
  labelFr: string;
  labelAr: string;
  verticalHint: string;
  fields: ImportEntityFieldSchema[];
}

export const IMPORT_ENTITY_SCHEMAS: Record<ImportEntityType, ImportEntitySchema> = {
  members: {
    entityType: 'members',
    labelEn: 'Members / Subscribers',
    labelFr: 'Adhérents / Membres',
    labelAr: 'الأعضاء والمشتركون',
    verticalHint: 'membership_session',
    fields: [
      { key: 'fullName', labelEn: 'Full Name', labelFr: 'Nom Complet', labelAr: 'الاسم الكامل', required: true, kind: 'text', aliases: ['fullname', 'full_name', 'nom', 'nom complet', 'member', 'adherent', 'الاسم', 'الاسم الكامل'] },
      { key: 'phoneNumber', labelEn: 'Phone', labelFr: 'Téléphone', labelAr: 'الهاتف', uniqueCandidate: true, kind: 'phone', aliases: ['phone', 'phonenumber', 'tel', 'telephone', 'mobile', 'gsm', 'الهاتف', 'رقم الهاتف'] },
      { key: 'email', labelEn: 'Email', labelFr: 'Email', labelAr: 'البريد الإلكتروني', uniqueCandidate: true, kind: 'email', aliases: ['email', 'mail', 'courriel', 'البريد', 'البريد الإلكتروني'] },
      { key: 'planName', labelEn: 'Plan / Formule', labelFr: 'Formule / Abonnement', labelAr: 'الصيغة / الاشتراك', kind: 'text', aliases: ['plan', 'planname', 'formule', 'abonnement', 'الباقة'] },
      { key: 'startDate', labelEn: 'Start Date', labelFr: 'Date Début', labelAr: 'تاريخ البدء', kind: 'date', aliases: ['startdate', 'start_date', 'debut', 'date debut', 'inscription', 'تاريخ البداية'] },
      { key: 'expirationDate', labelEn: 'Expiry Date', labelFr: 'Date Fin', labelAr: 'تاريخ الانتهاء', kind: 'date', aliases: ['expiry', 'expirationdate', 'expiration_date', 'fin', 'date fin', 'echeance', 'تاريخ الانتهاء'] },
      { key: 'remainingSessions', labelEn: 'Sessions', labelFr: 'Séances Restantes', labelAr: 'الحصص', kind: 'integer', aliases: ['sessions', 'remainingsessions', 'seances', 'الحصص'] },
      { key: 'balanceDue', labelEn: 'Balance Due (DA)', labelFr: 'Solde Dû (DA)', labelAr: 'الرصيد المستحق', kind: 'number', aliases: ['balance', 'balancedue', 'dette', 'solde', 'reste', 'الدين'] },
    ],
  },
  clients: {
    entityType: 'clients',
    labelEn: 'Clients & CRM Accounts',
    labelFr: 'Clients & Comptes CRM',
    labelAr: 'العملاء وحسابات الزبائن',
    verticalHint: 'shared_crm',
    fields: [
      { key: 'displayName', labelEn: 'Client / Company Name', labelFr: 'Nom / Raison Sociale', labelAr: 'الاسم / الشركة', required: true, kind: 'text', aliases: ['name', 'displayname', 'client', 'company', 'raison sociale', 'nom', 'العميل', 'الاسم'] },
      { key: 'phone', labelEn: 'Phone', labelFr: 'Téléphone', labelAr: 'الهاتف', uniqueCandidate: true, kind: 'phone', aliases: ['phone', 'tel', 'telephone', 'mobile', 'gsm', 'الهاتف'] },
      { key: 'email', labelEn: 'Email', labelFr: 'Email', labelAr: 'البريد', uniqueCandidate: true, kind: 'email', aliases: ['email', 'mail', 'البريد'] },
      { key: 'nif', labelEn: 'NIF', labelFr: 'NIF', labelAr: 'الرقم الجبائي', uniqueCandidate: true, kind: 'nif', aliases: ['nif', 'taxid', 'identifiant fiscal', 'الرقم الجبائي'] },
      { key: 'rc', labelEn: 'RC', labelFr: 'Registre Commerce', labelAr: 'السجل التجاري', kind: 'text', aliases: ['rc', 'registre', 'registre commerce', 'السجل التجاري'] },
      { key: 'address', labelEn: 'Address', labelFr: 'Adresse', labelAr: 'العنوان', kind: 'text', aliases: ['address', 'adresse', 'ville', 'wilaya', 'العنوان'] },
      { key: 'creditLimit', labelEn: 'Credit Limit (DA)', labelFr: 'Plafond Crédit (DA)', labelAr: 'سقف الائتمان', kind: 'number', aliases: ['creditlimit', 'plafond', 'credit', 'سقف الائتمان'] },
    ],
  },
  patients: {
    entityType: 'patients',
    labelEn: 'Medical Patients',
    labelFr: 'Patients Médicaux',
    labelAr: 'المرضى',
    verticalHint: 'medical_clinic',
    fields: [
      { key: 'fullName', labelEn: 'Patient Name', labelFr: 'Nom du Patient', labelAr: 'اسم المريض', required: true, kind: 'text', aliases: ['name', 'fullname', 'patient', 'nom', 'المريض', 'الاسم'] },
      { key: 'phone', labelEn: 'Phone', labelFr: 'Téléphone', labelAr: 'الهاتف', uniqueCandidate: true, kind: 'phone', aliases: ['phone', 'tel', 'telephone', 'mobile', 'الهاتف'] },
      { key: 'dob', labelEn: 'Date of Birth', labelFr: 'Date de Naissance', labelAr: 'تاريخ الميلاد', kind: 'date', aliases: ['dob', 'birthdate', 'naissance', 'date naissance', 'تاريخ الميلاد'] },
      { key: 'bloodGroup', labelEn: 'Blood Group', labelFr: 'Groupe Sanguin', labelAr: 'فصيلة الدم', kind: 'text', aliases: ['blood', 'bloodgroup', 'groupe sanguin', 'فصيلة الدم'] },
      { key: 'chifaNumber', labelEn: 'CHIFA / NSS', labelFr: 'N° Chifa / NSS', labelAr: 'رقم الشفاء', uniqueCandidate: true, kind: 'text', aliases: ['chifa', 'chifanumber', 'nss', 'secu', 'رقم الشفاء'] },
      { key: 'allergies', labelEn: 'Allergies', labelFr: 'Allergies', labelAr: 'الحساسية', kind: 'text', aliases: ['allergies', 'allergy', 'allergie', 'الحساسية'] },
    ],
  },
  products: {
    entityType: 'products',
    labelEn: 'Products & Catalog SKUs',
    labelFr: 'Articles & Produits Catalogue',
    labelAr: 'المنتجات والمخزون',
    verticalHint: 'trading_pos',
    fields: [
      { key: 'name', labelEn: 'Product Name', labelFr: 'Désignation Article', labelAr: 'اسم المنتج', required: true, kind: 'text', aliases: ['name', 'product', 'designation', 'libelle', 'article', 'المنتج', 'الاسم'] },
      { key: 'sku', labelEn: 'SKU / Reference', labelFr: 'SKU / Référence', labelAr: 'الرمز المرجعي', uniqueCandidate: true, kind: 'text', aliases: ['sku', 'ref', 'reference', 'code', 'الرمز'] },
      { key: 'barcode', labelEn: 'Barcode', labelFr: 'Code-barres', labelAr: 'الباركود', uniqueCandidate: true, kind: 'text', aliases: ['barcode', 'ean', 'codebarre', 'code barres', 'الباركود'] },
      { key: 'category', labelEn: 'Category', labelFr: 'Catégorie', labelAr: 'الفئة', kind: 'text', aliases: ['category', 'categorie', 'famille', 'الفئة'] },
      { key: 'priceAmount', labelEn: 'Sale Price (DA)', labelFr: 'Prix Vente (DA)', labelAr: 'سعر البيع', required: true, kind: 'number', aliases: ['price', 'priceamount', 'prix', 'prix vente', 'pv', 'السعر'] },
      { key: 'costPrice', labelEn: 'Cost Price (DA)', labelFr: 'Coût Achat (DA)', labelAr: 'تكلفة الشراء', kind: 'number', aliases: ['cost', 'costprice', 'cout', 'prix achat', 'pa', 'التكلفة'] },
      { key: 'stockQuantity', labelEn: 'Initial Stock', labelFr: 'Stock Initial', labelAr: 'الكمية', kind: 'number', aliases: ['stock', 'qty', 'quantity', 'stockquantity', 'qte', 'quantite', 'الكمية'] },
      { key: 'lowStockThreshold', labelEn: 'Alert Min', labelFr: 'Seuil Alerte', labelAr: 'حد التنبيه', kind: 'integer', aliases: ['min', 'threshold', 'seuil', 'alerte', 'حد التنبيه'] },
    ],
  },
  suppliers: {
    entityType: 'suppliers',
    labelEn: 'Suppliers / Vendors',
    labelFr: 'Fournisseurs',
    labelAr: 'الموردون',
    verticalHint: 'trading_commercial',
    fields: [
      { key: 'supplierName', labelEn: 'Supplier Name', labelFr: 'Raison Sociale Fournisseur', labelAr: 'اسم المورد', required: true, kind: 'text', aliases: ['name', 'supplier', 'suppliername', 'fournisseur', 'company', 'المورد'] },
      { key: 'phone', labelEn: 'Phone', labelFr: 'Téléphone', labelAr: 'الهاتف', uniqueCandidate: true, kind: 'phone', aliases: ['phone', 'tel', 'telephone', 'الهاتف'] },
      { key: 'email', labelEn: 'Email', labelFr: 'Email', labelAr: 'البريد', uniqueCandidate: true, kind: 'email', aliases: ['email', 'mail', 'البريد'] },
      { key: 'nif', labelEn: 'NIF', labelFr: 'NIF', labelAr: 'الرقم الجبائي', uniqueCandidate: true, kind: 'nif', aliases: ['nif', 'الرقم الجبائي'] },
      { key: 'rc', labelEn: 'RC', labelFr: 'RC', labelAr: 'السجل التجاري', kind: 'text', aliases: ['rc', 'registre', 'السجل التجاري'] },
      { key: 'address', labelEn: 'Address', labelFr: 'Adresse', labelAr: 'العنوان', kind: 'text', aliases: ['address', 'adresse', 'العنوان'] },
    ],
  },
  staff: {
    entityType: 'staff',
    labelEn: 'Staff & Employees',
    labelFr: 'Personnel & Employés',
    labelAr: 'الموظفون والطاقم',
    verticalHint: 'staff_payroll',
    fields: [
      { key: 'fullName', labelEn: 'Employee Name', labelFr: 'Nom Employé', labelAr: 'اسم الموظف', required: true, kind: 'text', aliases: ['name', 'fullname', 'employee', 'employe', 'staff', 'nom', 'الموظف', 'الاسم'] },
      { key: 'role', labelEn: 'Role', labelFr: 'Poste / Rôle', labelAr: 'المنصب', kind: 'text', aliases: ['role', 'poste', 'fonction', 'job', 'المنصب'] },
      { key: 'phone', labelEn: 'Phone', labelFr: 'Téléphone', labelAr: 'الهاتف', uniqueCandidate: true, kind: 'phone', aliases: ['phone', 'tel', 'telephone', 'الهاتف'] },
      { key: 'email', labelEn: 'Email', labelFr: 'Email', labelAr: 'البريد', uniqueCandidate: true, kind: 'email', aliases: ['email', 'mail', 'البريد'] },
      { key: 'baseSalaryDzd', labelEn: 'Base Salary (DA)', labelFr: 'Salaire Base (DA)', labelAr: 'الراتب الأساسي', kind: 'number', aliases: ['salary', 'basesalary', 'salaire', 'salaire base', 'الراتب'] },
      { key: 'hireDate', labelEn: 'Hire Date', labelFr: 'Date Embauche', labelAr: 'تاريخ التوظيف', kind: 'date', aliases: ['hiredate', 'embauche', 'date embauche', 'start', 'تاريخ التوظيف'] },
      { key: 'cnasNumber', labelEn: 'CNAS Number', labelFr: 'N° CNAS', labelAr: 'رقم الضمان الاجتماعي', uniqueCandidate: true, kind: 'text', aliases: ['cnas', 'nss', 'secu', 'الضمان الاجتماعي'] },
    ],
  },
  vehicles: {
    entityType: 'vehicles',
    labelEn: 'Garage & Fleet Vehicles',
    labelFr: 'Véhicules & Flotte',
    labelAr: 'المركبات والأسطول',
    verticalHint: 'auto_garage',
    fields: [
      { key: 'plateNumber', labelEn: 'Plate Number', labelFr: 'Matricule', labelAr: 'رقم اللوحة', required: true, uniqueCandidate: true, kind: 'text', aliases: ['plate', 'platenumber', 'matricule', 'immatriculation', 'الترقيم', 'اللوحة'] },
      { key: 'vin', labelEn: 'VIN / Chassis', labelFr: 'N° Châssis (VIN)', labelAr: 'رقم الهيكل', uniqueCandidate: true, kind: 'text', aliases: ['vin', 'chassis', 'numero chassis', 'الهيكل'] },
      { key: 'brand', labelEn: 'Brand / Make', labelFr: 'Marque', labelAr: 'الماركة', required: true, kind: 'text', aliases: ['brand', 'make', 'marque', 'الماركة'] },
      { key: 'model', labelEn: 'Model', labelFr: 'Modèle', labelAr: 'الطراز', kind: 'text', aliases: ['model', 'modele', 'الطراز'] },
      { key: 'year', labelEn: 'Year', labelFr: 'Année', labelAr: 'السنة', kind: 'integer', aliases: ['year', 'annee', 'السنة'] },
      { key: 'mileageKm', labelEn: 'Mileage (km)', labelFr: 'Kilométrage', labelAr: 'العداد', kind: 'integer', aliases: ['km', 'mileage', 'kilometrage', 'العداد'] },
      { key: 'ownerPhone', labelEn: 'Owner Phone', labelFr: 'Tél Propriétaire', labelAr: 'هاتف المالك', kind: 'phone', aliases: ['ownerphone', 'phone', 'tel', 'هاتف المالك'] },
    ],
  },
  parcels: {
    entityType: 'parcels',
    labelEn: 'Logistics Parcels',
    labelFr: 'Colis & Expéditions',
    labelAr: 'الطرود والشحنات',
    verticalHint: 'logistics_delivery',
    fields: [
      { key: 'trackingCode', labelEn: 'Tracking Code', labelFr: 'Code Suivi', labelAr: 'رمز التتبع', required: true, uniqueCandidate: true, kind: 'text', aliases: ['tracking', 'trackingcode', 'code', 'colis', 'awb', 'التتبع'] },
      { key: 'recipientName', labelEn: 'Recipient Name', labelFr: 'Destinataire', labelAr: 'المستلم', required: true, kind: 'text', aliases: ['recipient', 'recipientname', 'destinataire', 'client', 'المستلم'] },
      { key: 'recipientPhone', labelEn: 'Recipient Phone', labelFr: 'Tél Destinataire', labelAr: 'هاتف المستلم', required: true, kind: 'phone', aliases: ['phone', 'recipientphone', 'tel', 'téléphone', 'الهاتف'] },
      { key: 'wilayaCode', labelEn: 'Wilaya Code', labelFr: 'Code Wilaya', labelAr: 'رمز الولاية', required: true, kind: 'text', aliases: ['wilaya', 'wilayacode', 'code wilaya', 'الولاية'] },
      { key: 'commune', labelEn: 'Commune', labelFr: 'Commune', labelAr: 'البلدية', kind: 'text', aliases: ['commune', 'ville', 'city', 'البلدية'] },
      { key: 'codAmountDzd', labelEn: 'COD Amount (DA)', labelFr: 'Montant COD (DA)', labelAr: 'مبلغ الدفع عند الاستلام', kind: 'number', aliases: ['cod', 'amount', 'montant', 'prix', 'المبلغ'] },
      { key: 'weightKg', labelEn: 'Weight (kg)', labelFr: 'Poids (kg)', labelAr: 'الوزن', kind: 'number', aliases: ['weight', 'poids', 'kg', 'الوزن'] },
    ],
  },
  properties: {
    entityType: 'properties',
    labelEn: 'Real Estate Properties',
    labelFr: 'Biens Immobiliers',
    labelAr: 'العقارات',
    verticalHint: 'real_estate',
    fields: [
      { key: 'reference', labelEn: 'Reference Code', labelFr: 'Référence Bien', labelAr: 'مرجع العقار', required: true, uniqueCandidate: true, kind: 'text', aliases: ['ref', 'reference', 'code', 'المرجع'] },
      { key: 'title', labelEn: 'Property Title', labelFr: 'Titre / Désignation', labelAr: 'عنوان العقار', required: true, kind: 'text', aliases: ['title', 'titre', 'nom', 'designation', 'العنوان'] },
      { key: 'propertyType', labelEn: 'Type (Appartement / Villa / Local)', labelFr: 'Type de Bien', labelAr: 'نوع العقار', kind: 'text', aliases: ['type', 'propertytype', 'categorie', 'النوع'] },
      { key: 'wilaya', labelEn: 'Wilaya', labelFr: 'Wilaya', labelAr: 'الولاية', kind: 'text', aliases: ['wilaya', 'ville', 'city', 'الولاية'] },
      { key: 'surfaceM2', labelEn: 'Surface (m²)', labelFr: 'Surface (m²)', labelAr: 'المساحة', kind: 'number', aliases: ['surface', 'area', 'm2', 'المساحة'] },
      { key: 'priceDzd', labelEn: 'Price / Rent (DA)', labelFr: 'Prix / Loyer (DA)', labelAr: 'السعر / الإيجار', kind: 'number', aliases: ['price', 'rent', 'loyer', 'prix', 'السعر'] },
      { key: 'ownerPhone', labelEn: 'Owner Phone', labelFr: 'Tél Propriétaire', labelAr: 'هاتف المالك', kind: 'phone', aliases: ['phone', 'ownerphone', 'tel', 'الهاتف'] },
    ],
  },
  students: {
    entityType: 'students',
    labelEn: 'Academy Students',
    labelFr: 'Apprenants / Étudiants',
    labelAr: 'الطلبة والمتدربون',
    verticalHint: 'education_cohort',
    fields: [
      { key: 'fullName', labelEn: 'Student Name', labelFr: 'Nom Étudiant', labelAr: 'اسم الطالب', required: true, kind: 'text', aliases: ['name', 'fullname', 'student', 'etudiant', 'nom', 'الطالب', 'الاسم'] },
      { key: 'registrationNumber', labelEn: 'Student ID / Matricule', labelFr: 'Matricule', labelAr: 'رقم التسجيل', uniqueCandidate: true, kind: 'text', aliases: ['matricule', 'reg', 'registration', 'code', 'id', 'رقم التسجيل'] },
      { key: 'phone', labelEn: 'Student / Parent Phone', labelFr: 'Téléphone', labelAr: 'الهاتف', uniqueCandidate: true, kind: 'phone', aliases: ['phone', 'tel', 'parentphone', 'telephone', 'الهاتف'] },
      { key: 'email', labelEn: 'Email', labelFr: 'Email', labelAr: 'البريد', uniqueCandidate: true, kind: 'email', aliases: ['email', 'mail', 'البريد'] },
      { key: 'cohortName', labelEn: 'Cohort / Class', labelFr: 'Cohorte / Classe', labelAr: 'الفوج', kind: 'text', aliases: ['cohort', 'cohorte', 'classe', 'niveau', 'groupe', 'الفوج'] },
      { key: 'dob', labelEn: 'Birth Date', labelFr: 'Date Naissance', labelAr: 'تاريخ الميلاد', kind: 'date', aliases: ['dob', 'naissance', 'birthdate', 'تاريخ الميلاد'] },
    ],
  },
};

// ============================================================================
// NORMALIZERS: ARABIC DIGITS, EXCEL SERIAL DATES, PHONES, FORMULA INJECTION
// ============================================================================

const ARABIC_INDIC_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٫': '.', '،': ',',
};

export function normalizeArabicIndicDigits(raw: string | number | null | undefined): string {
  const s = String(raw ?? '');
  return s.replace(/[٠-٩۰-۹٫،]/g, (ch) => ARABIC_INDIC_MAP[ch] ?? ch);
}

/**
 * Converts Excel serial date (including Excel's 1900 leap-year bug on serial >= 60)
 * or common DD/MM/YYYY / YYYY-MM-DD strings into canonical YYYY-MM-DD.
 */
export function parseImportDateToIso(raw: string | number | null | undefined, date1904 = false): string | null {
  if (raw === null || raw === undefined) return null;
  const cleaned = normalizeArabicIndicDigits(String(raw)).trim();
  if (!cleaned) return null;

  // Numeric Excel serial (typically 20000..70000 for 1954..2091, or > 1)
  if (/^\d{1,6}(\.\d+)?$/.test(cleaned)) {
    const serial = Number(cleaned);
    if (serial >= 1 && serial <= 2958465) {
      const wholeDays = Math.floor(serial);
      const baseEpochMs = date1904
        ? Date.UTC(1904, 0, 1)
        : Date.UTC(1899, 11, 30); // Excel day 1 = 1900-01-01; day 60 is phantom 1900-02-29
      const adjustedDays = !date1904 && wholeDays < 60 ? wholeDays + 1 : wholeDays;
      const d = new Date(baseEpochMs + adjustedDays * 86_400_000);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
  }

  // ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    const check = new Date(`${y}-${mm}-${dd}T00:00:00Z`);
    if (!Number.isNaN(check.getTime()) && check.toISOString().slice(0, 10) === `${y}-${mm}-${dd}`) {
      return `${y}-${mm}-${dd}`;
    }
    return null;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    const check = new Date(`${y}-${mm}-${dd}T00:00:00Z`);
    if (!Number.isNaN(check.getTime()) && check.toISOString().slice(0, 10) === `${y}-${mm}-${dd}`) {
      return `${y}-${mm}-${dd}`;
    }
    return null;
  }

  return null;
}

export function normalizeImportNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const ascii = normalizeArabicIndicDigits(String(raw)).trim();
  if (!ascii) return null;
  // Strip currency labels & spaces, handle French decimal comma when no dot exists
  let numStr = ascii.replace(/\s*(DA|DZD|EUR|USD|\u20AC|\$)\s*$/i, '').replace(/[\s\u00A0]/g, '');
  if (numStr.includes(',') && !numStr.includes('.')) {
    numStr = numStr.replace(',', '.');
  } else {
    numStr = numStr.replace(/,/g, '');
  }
  const parsed = Number(numStr);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeImportPhone(raw: string | null | undefined): {
  valid: boolean;
  formatted: string;
  e164: string | null;
} {
  const ascii = normalizeArabicIndicDigits(raw).trim();
  if (!ascii) return { valid: false, formatted: '', e164: null };
  // Support +213XXXXXXXXX or 00213XXXXXXXXX -> 0XXXXXXXXX for Algerian phone validator
  let candidate = ascii.replace(/[\s\-.()]/g, '');
  if (candidate.startsWith('+213')) candidate = `0${candidate.slice(4)}`;
  else if (candidate.startsWith('00213')) candidate = `0${candidate.slice(5)}`;
  else if (/^[567]\d{8}$/.test(candidate)) candidate = `0${candidate}`;

  const crm = normalizeAlgerianPhoneForCrm(candidate);
  if (crm.valid) {
    return { valid: true, formatted: crm.formatted, e164: crm.e164 };
  }
  return { valid: false, formatted: ascii, e164: null };
}

/**
 * Prevents Excel / LibreOffice CSV formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`).
 */
export function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const trimmedLeading = raw.replace(/^[\s\uFEFF]+/, '');
  const safe =
    /^[=+\-@\t\r]/.test(trimmedLeading) || /^[\t\r]/.test(raw)
      ? `'${raw}`
      : raw;
  const escaped = safe.replace(/"/g, '""');
  return /[",\n\r;]/.test(safe) ? `"${escaped}"` : escaped;
}

export function buildFormulaSafeCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map((h) => sanitizeCsvCell(h)).join(',')];
  for (const row of rows) {
    lines.push(row.map((cell) => sanitizeCsvCell(cell)).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

// ============================================================================
// BYTE DECODER (UTF-8 BOM / UTF-16LE / WINDOWS-1256 / ISO-8859-1) & XLSX
// ============================================================================

export function decodeImportBytes(
  bytes: Uint8Array,
  preferred: ImportEncoding = 'auto'
): { text: string; detectedEncoding: Exclude<ImportEncoding, 'auto'> } {
  if (bytes.length === 0) {
    return { text: '', detectedEncoding: 'utf-8' };
  }

  // BOM checks first
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return {
      text: new TextDecoder('utf-8').decode(bytes.subarray(3)),
      detectedEncoding: 'utf-8',
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      text: new TextDecoder('utf-16le').decode(bytes.subarray(2)),
      detectedEncoding: 'utf-16le',
    };
  }

  if (preferred !== 'auto') {
    const text = new TextDecoder(preferred).decode(bytes);
    return { text: text.replace(/^\uFEFF/, ''), detectedEncoding: preferred };
  }

  // Try strict UTF-8
  try {
    const strictUtf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text: strictUtf8.replace(/^\uFEFF/, ''), detectedEncoding: 'utf-8' };
  } catch {
    // Compare Windows-1256 (Arabic 0xC1-0xFA) vs ISO-8859-1 (French accented)
    let arabicScore = 0;
    let frenchScore = 0;
    const frenchLatinBytes = new Set([0xe9, 0xe8, 0xea, 0xe0, 0xe2, 0xe7, 0xf4, 0xfb, 0xee, 0xef, 0xc9, 0xc8, 0xc0]);
    for (let i = 0; i < Math.min(bytes.length, 4096); i++) {
      const b = bytes[i];
      if (b < 0x80) continue;
      if (frenchLatinBytes.has(b)) frenchScore += 2;
      if (b >= 0xc1 && b <= 0xf2 && !frenchLatinBytes.has(b)) arabicScore += 2;
      if (b === 0xdd || b === 0xde || b === 0xdc) arabicScore += 1;
    }
    const chosen: Exclude<ImportEncoding, 'auto'> = arabicScore > frenchScore ? 'windows-1256' : 'iso-8859-1';
    return {
      text: new TextDecoder(chosen).decode(bytes),
      detectedEncoding: chosen,
    };
  }
}

export function detectCsvDelimiter(text: string): ',' | ';' | '\t' {
  const sampleLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 10);
  if (sampleLines.length === 0) return ',';

  const countOutsideQuotes = (line: string, sep: string): number => {
    let inQuotes = false;
    let count = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes && ch === sep) {
        count++;
      }
    }
    return count;
  };

  const candidates: Array<',' | ';' | '\t'> = [';', ',', '\t'];
  let best: ',' | ';' | '\t' = ',';
  let bestScore = -1;

  for (const sep of candidates) {
    const counts = sampleLines.map((l) => countOutsideQuotes(l, sep));
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    const first = counts[0];
    const consistencyBonus = counts.filter((c) => c === first && c > 0).length * 10;
    const score = total + consistencyBonus;
    if (score > bestScore) {
      bestScore = score;
      best = sep;
    }
  }
  return best;
}

export interface ParsedImportTable {
  headers: string[];
  rows: string[][];
  detectedEncoding: Exclude<ImportEncoding, 'auto'>;
  detectedDelimiter: ',' | ';' | '\t';
  parseWarnings: ImportRowError[];
  sourceFormat: 'csv' | 'xlsx' | 'xml';
}

/**
 * Fast, streaming-style RFC-4180 CSV parser capable of 50,000+ rows cleanly
 * without stack overflow or crashing on malformed/unclosed quotes.
 */
export function parseDelimitedCsv(
  text: string,
  delimiter: ',' | ';' | '\t' = ','
): { headers: string[]; rows: string[][]; parseWarnings: ImportRowError[] } {
  const cleanText = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  const parseWarnings: ImportRowError[] = [];

  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldStart = true;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (fieldStart && ch === '"') {
      inQuotes = true;
      fieldStart = false;
      continue;
    }

    if (ch === delimiter) {
      row.push(field);
      field = '';
      fieldStart = true;
      continue;
    }

    if (ch === '\r') {
      if (cleanText[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((c) => c.trim().length > 0)) {
        records.push(row);
      }
      row = [];
      field = '';
      fieldStart = true;
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      if (row.some((c) => c.trim().length > 0)) {
        records.push(row);
      }
      row = [];
      field = '';
      fieldStart = true;
      continue;
    }

    field += ch;
    fieldStart = false;
  }

  if (inQuotes) {
    parseWarnings.push({
      rowNumber: Math.max(1, records.length),
      errorCode: 'UNCLOSED_QUOTE',
      messageEn: 'Unclosed quotation mark recovered at end of file.',
      messageFr: 'Guillemet non fermé récupéré en fin de fichier.',
      messageAr: 'تم إصلاح علامة اقتباس غير مغلقة في نهاية الملف.',
    });
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim().length > 0)) {
      records.push(row);
    }
  }

  if (records.length === 0) {
    return { headers: [], rows: [], parseWarnings };
  }

  const headers = records[0].map((h, idx) => h.trim() || `column_${idx + 1}`);
  const rows = records.slice(1);
  return { headers, rows, parseWarnings };
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function colRefToIndex(colRef: string): number {
  const letters = colRef.replace(/\d+/g, '').toUpperCase();
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, idx - 1);
}

/**
 * Pure OOXML (.xlsx) reader backed by `fflate.unzipSync` (zero prototype-pollution risk).
 */
export function parseXlsxBytes(bytes: Uint8Array): {
  headers: string[];
  rows: string[][];
  parseWarnings: ImportRowError[];
} {
  const files = unzipSync(bytes);
  const parseWarnings: ImportRowError[] = [];

  const sharedStrings: string[] = [];
  const ssFile = files['xl/sharedStrings.xml'];
  if (ssFile) {
    const ssXml = strFromU8(ssFile);
    const siMatches = ssXml.match(/<si\b[^>]*>[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = [...si.matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) =>
        decodeXmlEntities(m[1])
      );
      sharedStrings.push(tMatches.join(''));
    }
  }

  const sheetKey =
    Object.keys(files).find((k) => k === 'xl/worksheets/sheet1.xml') ||
    Object.keys(files).find((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k));
  if (!sheetKey) {
    return {
      headers: [],
      rows: [],
      parseWarnings: [
        {
          rowNumber: 0,
          errorCode: 'XLSX_NO_SHEET',
          messageEn: 'No worksheet found inside XLSX archive.',
          messageFr: 'Aucune feuille trouvée dans le classeur XLSX.',
          messageAr: 'لم يتم العثور على ورقة عمل داخل ملف XLSX.',
        },
      ],
    };
  }

  const sheetXml = strFromU8(files[sheetKey]);
  const rowMatches = sheetXml.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) || [];
  const grid: string[][] = [];

  for (const rowXml of rowMatches) {
    const cells: string[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let m: RegExpExecArray | null;
    while ((m = cellRegex.exec(rowXml)) !== null) {
      const attrs = m[1];
      const inner = m[2];
      const refMatch = attrs.match(/\br="([A-Za-z]+\d+)"/);
      const typeMatch = attrs.match(/\bt="([^"]+)"/);
      const colIdx = refMatch ? colRefToIndex(refMatch[1]) : cells.length;
      const cellType = typeMatch ? typeMatch[1] : 'n';

      let value = '';
      if (cellType === 'inlineStr') {
        const isText = [...inner.matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g)]
          .map((tm) => decodeXmlEntities(tm[1]))
          .join('');
        value = isText;
      } else {
        const vMatch = inner.match(/<v(?:\s+[^>]*)?>([\s\S]*?)<\/v>/);
        const rawV = vMatch ? decodeXmlEntities(vMatch[1]) : '';
        if (cellType === 's') {
          const ssIdx = Number(rawV);
          value = Number.isInteger(ssIdx) && sharedStrings[ssIdx] !== undefined ? sharedStrings[ssIdx] : rawV;
        } else if (cellType === 'b') {
          value = rawV === '1' ? 'true' : 'false';
        } else {
          value = rawV;
        }
      }

      while (cells.length <= colIdx) cells.push('');
      cells[colIdx] = value;
    }

    if (cells.some((c) => c.trim().length > 0)) {
      grid.push(cells);
    }
  }

  if (grid.length === 0) return { headers: [], rows: [], parseWarnings };
  const headers = grid[0].map((h, i) => h.trim() || `column_${i + 1}`);
  const rows = grid.slice(1).map((r) => headers.map((_, idx) => r[idx] ?? ''));
  return { headers, rows, parseWarnings };
}

export function parseImportFileBuffer(params: {
  fileName: string;
  bytes: Uint8Array;
  encoding?: ImportEncoding;
  delimiter?: ImportDelimiter;
}): ParsedImportTable {
  const { fileName, bytes, encoding = 'auto', delimiter = 'auto' } = params;
  const isZipXlsx =
    fileName.toLowerCase().endsWith('.xlsx') ||
    (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04);

  if (isZipXlsx) {
    try {
      const xlsx = parseXlsxBytes(bytes);
      return {
        headers: xlsx.headers,
        rows: xlsx.rows,
        detectedEncoding: 'utf-8',
        detectedDelimiter: ',',
        parseWarnings: xlsx.parseWarnings,
        sourceFormat: 'xlsx',
      };
    } catch (err: any) {
      return {
        headers: [],
        rows: [],
        detectedEncoding: 'utf-8',
        detectedDelimiter: ',',
        parseWarnings: [
          {
            rowNumber: 0,
            errorCode: 'XLSX_CORRUPT',
            messageEn: `Failed to decode XLSX workbook: ${err?.message || 'corrupt zip'}`,
            messageFr: `Échec lecture XLSX : ${err?.message || 'archive invalide'}`,
            messageAr: `تعذر قراءة ملف XLSX: ${err?.message || 'ملف تالف'}`,
          },
        ],
        sourceFormat: 'xlsx',
      };
    }
  }

  const decoded = decodeImportBytes(bytes, encoding);
  // Excel 2003 SpreadsheetML (.xml or .xls XML export)
  if (/<\?xml|<Workbook/i.test(decoded.text.slice(0, 400))) {
    const rowMatches = decoded.text.match(/<Row\b[^>]*>[\s\S]*?<\/Row>/gi) || [];
    const grid: string[][] = [];
    for (const rXml of rowMatches) {
      const cells: string[] = [];
      const dataMatches = [...rXml.matchAll(/<Data\b[^>]*>([\s\S]*?)<\/Data>/gi)];
      for (const dm of dataMatches) {
        cells.push(decodeXmlEntities(dm[1]));
      }
      if (cells.some((c) => c.trim().length > 0)) grid.push(cells);
    }
    const headers = grid[0]?.map((h, i) => h.trim() || `column_${i + 1}`) || [];
    return {
      headers,
      rows: grid.slice(1),
      detectedEncoding: decoded.detectedEncoding,
      detectedDelimiter: ',',
      parseWarnings: [],
      sourceFormat: 'xml',
    };
  }

  const resolvedDelimiter =
    delimiter === 'auto' ? detectCsvDelimiter(decoded.text) : delimiter;
  const csv = parseDelimitedCsv(decoded.text, resolvedDelimiter);
  return {
    headers: csv.headers,
    rows: csv.rows,
    detectedEncoding: decoded.detectedEncoding,
    detectedDelimiter: resolvedDelimiter,
    parseWarnings: csv.parseWarnings,
    sourceFormat: 'csv',
  };
}

// ============================================================================
// AUTO-MAPPING, DRY-RUN VALIDATION & DUPLICATE RESOLUTION
// ============================================================================

function normalizeHeaderToken(h: string): string {
  return normalizeArabicIndicDigits(h)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function suggestColumnMapping(
  headers: string[],
  entityType: ImportEntityType
): Record<string, string> {
  const schema = IMPORT_ENTITY_SCHEMAS[entityType];
  const map: Record<string, string> = {};
  const usedTargets = new Set<string>();

  for (const header of headers) {
    const token = normalizeHeaderToken(header);
    if (!token) continue;
    let matchedKey: string | undefined;

    for (const field of schema.fields) {
      if (usedTargets.has(field.key)) continue;
      if (
        normalizeHeaderToken(field.key) === token ||
        normalizeHeaderToken(field.labelEn) === token ||
        normalizeHeaderToken(field.labelFr) === token ||
        field.aliases.some((a) => normalizeHeaderToken(a) === token)
      ) {
        matchedKey = field.key;
        break;
      }
    }

    if (!matchedKey) {
      for (const field of schema.fields) {
        if (usedTargets.has(field.key)) continue;
        if (field.aliases.some((a) => token.includes(normalizeHeaderToken(a)) && a.length >= 3)) {
          matchedKey = field.key;
          break;
        }
      }
    }

    if (matchedKey) {
      map[header] = matchedKey;
      usedTargets.add(matchedKey);
    }
  }

  return map;
}

export interface NormalizedImportRecord {
  rowNumber: number;
  action: 'insert' | 'update' | 'merge' | 'skip';
  matchedExistingId?: string;
  values: Record<string, any>;
}

export interface ImportDryRunResult {
  entityType: ImportEntityType;
  totalRows: number;
  validRows: number;
  toInsert: number;
  toUpdate: number;
  toMerge: number;
  toSkip: number;
  errorCount: number;
  errors: ImportRowError[];
  normalizedRecords: NormalizedImportRecord[];
}

export function buildExistingKeyIndex(
  entityType: ImportEntityType,
  existingItems: Array<Record<string, any>>
): Map<string, string> {
  const index = new Map<string, string>();
  const schema = IMPORT_ENTITY_SCHEMAS[entityType];
  const uniqueFields = schema.fields.filter((f) => f.uniqueCandidate);

  for (const item of existingItems) {
    const id = String(item.id || '');
    if (!id) continue;
    for (const f of uniqueFields) {
      const val = item[f.key];
      if (!val) continue;
      let keyVal = '';
      if (f.kind === 'phone') {
        const p = normalizeImportPhone(String(val));
        keyVal = p.e164 || p.formatted;
      } else if (f.kind === 'email') {
        keyVal = normalizeEmail(String(val)) || '';
      } else if (f.kind === 'nif') {
        keyVal = normalizeNif(String(val)) || '';
      } else {
        keyVal = String(val).trim().toLowerCase();
      }
      if (keyVal) {
        index.set(`${f.key}:${keyVal}`, id);
      }
    }
  }
  return index;
}

export function runImportDryRun(params: {
  entityType: ImportEntityType;
  headers: string[];
  rows: string[][];
  columnMap: Record<string, string>;
  duplicatePolicy: ImportDuplicatePolicy;
  existingItems?: Array<Record<string, any>>;
  date1904?: boolean;
}): ImportDryRunResult {
  const {
    entityType,
    headers,
    rows,
    columnMap,
    duplicatePolicy,
    existingItems = [],
    date1904 = false,
  } = params;

  const schema = IMPORT_ENTITY_SCHEMAS[entityType];
  const fieldByKey = new Map(schema.fields.map((f) => [f.key, f]));
  const keyIndex = buildExistingKeyIndex(entityType, existingItems);
  const seenFileKeys = new Map<string, number>();

  const errors: ImportRowError[] = [];
  const normalizedRecords: NormalizedImportRecord[] = [];
  let toInsert = 0;
  let toUpdate = 0;
  let toMerge = 0;
  let toSkip = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    if (row.every((cell) => String(cell ?? '').trim() === '')) {
      continue;
    }

    const rowValues: Record<string, any> = {};
    const rowErrors: ImportRowError[] = [];

    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      const targetKey = columnMap[header];
      if (!targetKey) continue;
      const fieldMeta = fieldByKey.get(targetKey);
      if (!fieldMeta) continue;

      const rawCell = String(row[c] ?? '').trim();
      if (!rawCell) continue;

      if (fieldMeta.kind === 'number') {
        const num = normalizeImportNumber(rawCell);
        if (num === null || num < 0) {
          rowErrors.push({
            rowNumber,
            column: header,
            errorCode: 'INVALID_NUMBER',
            messageEn: `Invalid non-negative number in "${header}"`,
            messageFr: `Nombre invalide ou négatif dans « ${header} »`,
            messageAr: `قيمة رقمية غير صالحة في "${header}"`,
            rawValue: rawCell,
          });
        } else {
          rowValues[targetKey] = num;
        }
      } else if (fieldMeta.kind === 'integer') {
        const num = normalizeImportNumber(rawCell);
        if (num === null || !Number.isInteger(num) || num < 0) {
          rowErrors.push({
            rowNumber,
            column: header,
            errorCode: 'INVALID_INTEGER',
            messageEn: `Invalid whole integer in "${header}"`,
            messageFr: `Entier invalide dans « ${header} »`,
            messageAr: `عدد صحيح غير صالح في "${header}"`,
            rawValue: rawCell,
          });
        } else {
          rowValues[targetKey] = num;
        }
      } else if (fieldMeta.kind === 'date') {
        const iso = parseImportDateToIso(rawCell, date1904);
        if (!iso) {
          rowErrors.push({
            rowNumber,
            column: header,
            errorCode: 'INVALID_DATE',
            messageEn: `Invalid date format in "${header}"`,
            messageFr: `Format de date invalide dans « ${header} »`,
            messageAr: `تنسيق تاريخ غير صالح في "${header}"`,
            rawValue: rawCell,
          });
        } else {
          rowValues[targetKey] = iso;
        }
      } else if (fieldMeta.kind === 'phone') {
        const ph = normalizeImportPhone(rawCell);
        if (!ph.valid) {
          rowErrors.push({
            rowNumber,
            column: header,
            errorCode: 'INVALID_PHONE',
            messageEn: `Invalid Algerian phone (+213 / 05-06-07-02) in "${header}"`,
            messageFr: `Numéro de téléphone algérien invalide dans « ${header} »`,
            messageAr: `رقم هاتف جزائري غير صالح في "${header}"`,
            rawValue: rawCell,
          });
        } else {
          rowValues[targetKey] = ph.e164 || ph.formatted;
        }
      } else if (fieldMeta.kind === 'email') {
        const em = normalizeEmail(rawCell);
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          rowErrors.push({
            rowNumber,
            column: header,
            errorCode: 'INVALID_EMAIL',
            messageEn: `Invalid email address in "${header}"`,
            messageFr: `Adresse email invalide dans « ${header} »`,
            messageAr: `بريد إلكتروني غير صالح في "${header}"`,
            rawValue: rawCell,
          });
        } else {
          rowValues[targetKey] = em;
        }
      } else if (fieldMeta.kind === 'nif') {
        const nif = normalizeNif(rawCell);
        if (!nif || nif.length < 9) {
          rowErrors.push({
            rowNumber,
            column: header,
            errorCode: 'INVALID_NIF',
            messageEn: `Invalid NIF identifier in "${header}"`,
            messageFr: `Identifiant NIF invalide dans « ${header} »`,
            messageAr: `رقم جبائي غير صالح في "${header}"`,
            rawValue: rawCell,
          });
        } else {
          rowValues[targetKey] = nif;
        }
      } else {
        rowValues[targetKey] = normalizeArabicIndicDigits(rawCell);
      }
    }

    // Check required fields (skip redundant MISSING_REQUIRED if a format error was already logged for this field)
    for (const reqField of schema.fields.filter((f) => f.required)) {
      const val = rowValues[reqField.key];
      const alreadyErrored = rowErrors.some((e) => {
        const mappedTarget = e.column ? columnMap[e.column] || e.column : undefined;
        return mappedTarget === reqField.key;
      });
      if (!alreadyErrored && (val === undefined || val === null || String(val).trim() === '')) {
        rowErrors.push({
          rowNumber,
          column: reqField.key,
          errorCode: 'MISSING_REQUIRED',
          messageEn: `Missing required field "${reqField.labelEn}"`,
          messageFr: `Champ obligatoire manquant : « ${reqField.labelFr} »`,
          messageAr: `حقل مطلوب مفقود: "${reqField.labelAr}"`,
        });
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    // Duplicate resolution against existing records + earlier rows in the same file
    let matchedExistingId: string | undefined;
    const uniqueTokens: string[] = [];
    for (const uf of schema.fields.filter((f) => f.uniqueCandidate)) {
      const v = rowValues[uf.key];
      if (!v) continue;
      const tokenVal =
        uf.kind === 'phone' || uf.kind === 'email' || uf.kind === 'nif'
          ? String(v)
          : String(v).trim().toLowerCase();
      const key = `${uf.key}:${tokenVal}`;
      uniqueTokens.push(key);
      if (!matchedExistingId && keyIndex.has(key)) {
        matchedExistingId = keyIndex.get(key);
      }
    }

    let duplicateInFileRow: number | undefined;
    for (const k of uniqueTokens) {
      if (seenFileKeys.has(k)) {
        duplicateInFileRow = seenFileKeys.get(k);
        break;
      }
    }
    for (const k of uniqueTokens) {
      if (!seenFileKeys.has(k)) seenFileKeys.set(k, rowNumber);
    }

    if (matchedExistingId || duplicateInFileRow !== undefined) {
      if (duplicatePolicy === 'skip') {
        toSkip++;
        normalizedRecords.push({
          rowNumber,
          action: 'skip',
          matchedExistingId,
          values: rowValues,
        });
      } else if (duplicatePolicy === 'update') {
        toUpdate++;
        normalizedRecords.push({
          rowNumber,
          action: 'update',
          matchedExistingId,
          values: rowValues,
        });
      } else {
        toMerge++;
        normalizedRecords.push({
          rowNumber,
          action: 'merge',
          matchedExistingId,
          values: rowValues,
        });
      }
    } else {
      toInsert++;
      normalizedRecords.push({
        rowNumber,
        action: 'insert',
        values: rowValues,
      });
    }
  }

  return {
    entityType,
    totalRows: rows.length,
    validRows: toInsert + toUpdate + toMerge + toSkip,
    toInsert,
    toUpdate,
    toMerge,
    toSkip,
    errorCount: errors.length,
    errors,
    normalizedRecords,
  };
}

// ============================================================================
// CHUNKED COMMIT EXECUTOR WITH TRANSACTIONAL / BATCH ROLLBACK
// ============================================================================

export interface ChunkCommitResult {
  status: 'committed' | 'rolled_back' | 'partial_failed';
  chunksTotal: number;
  chunksCommitted: number;
  insertedCount: number;
  updatedCount: number;
  mergedCount: number;
  skippedCount: number;
  createdIds: string[];
  errors: ImportRowError[];
}

export function executeChunkedImportCommit(params: {
  records: NormalizedImportRecord[];
  chunkSize?: number;
  rollbackOnFailure?: boolean;
  applyChunk: (chunk: NormalizedImportRecord[], chunkIndex: number) => {
    ok: boolean;
    createdIds?: string[];
    error?: string;
  };
  rollbackCreatedIds?: (createdIds: string[]) => void;
}): ChunkCommitResult {
  const {
    records,
    chunkSize = 500,
    rollbackOnFailure = true,
    applyChunk,
    rollbackCreatedIds,
  } = params;

  const safeChunkSize = Math.max(1, Math.min(5000, chunkSize));
  const chunks: NormalizedImportRecord[][] = [];
  for (let i = 0; i < records.length; i += safeChunkSize) {
    chunks.push(records.slice(i, i + safeChunkSize));
  }

  let chunksCommitted = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let mergedCount = 0;
  let skippedCount = 0;
  const createdIds: string[] = [];
  const errors: ImportRowError[] = [];

  for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
    const chunk = chunks[cIdx];
    const res = applyChunk(chunk, cIdx);
    if (!res.ok) {
      errors.push({
        rowNumber: chunk[0]?.rowNumber || 0,
        errorCode: 'CHUNK_COMMIT_FAILED',
        messageEn: `Chunk ${cIdx + 1}/${chunks.length} failed: ${res.error || 'Unknown error'}`,
        messageFr: `Échec du lot ${cIdx + 1}/${chunks.length} : ${res.error || 'Erreur inconnue'}`,
        messageAr: `فشل الدفعة ${cIdx + 1}/${chunks.length}: ${res.error || 'خطأ غير معروف'}`,
      });
      if (rollbackOnFailure) {
        rollbackCreatedIds?.(createdIds);
        return {
          status: 'rolled_back',
          chunksTotal: chunks.length,
          chunksCommitted: 0,
          insertedCount: 0,
          updatedCount: 0,
          mergedCount: 0,
          skippedCount: 0,
          createdIds: [],
          errors,
        };
      }
      return {
        status: 'partial_failed',
        chunksTotal: chunks.length,
        chunksCommitted,
        insertedCount,
        updatedCount,
        mergedCount,
        skippedCount,
        createdIds,
        errors,
      };
    }

    chunksCommitted++;
    if (res.createdIds?.length) createdIds.push(...res.createdIds);
    for (const rec of chunk) {
      if (rec.action === 'insert') insertedCount++;
      else if (rec.action === 'update') updatedCount++;
      else if (rec.action === 'merge') mergedCount++;
      else skippedCount++;
    }
  }

  return {
    status: 'committed',
    chunksTotal: chunks.length,
    chunksCommitted,
    insertedCount,
    updatedCount,
    mergedCount,
    skippedCount,
    createdIds,
    errors,
  };
}

export function buildSampleCsvForEntity(entityType: ImportEntityType): string {
  const schema = IMPORT_ENTITY_SCHEMAS[entityType];
  const headers = schema.fields.map((f) => f.key);
  const sampleRow = schema.fields.map((f) => {
    if (f.kind === 'phone') return '+213550112233';
    if (f.kind === 'email') return 'contact@example.dz';
    if (f.kind === 'date') return '2026-11-01';
    if (f.kind === 'nif') return '001916001234567';
    if (f.kind === 'number') return '1500';
    if (f.kind === 'integer') return '10';
    if (f.key === 'wilayaCode') return '16';
    if (f.key === 'plateNumber') return '01234-121-16';
    return `Sample ${f.labelEn}`;
  });
  return buildFormulaSafeCsv(headers, [sampleRow]);
}

export function buildImportErrorsReportCsv(errors: ImportRowError[]): string {
  const headers = ['Row', 'Column', 'ErrorCode', 'MessageEN', 'MessageFR', 'MessageAR', 'RawValue'];
  const rows = errors.map((e) => [
    e.rowNumber,
    e.column || '',
    e.errorCode,
    e.messageEn,
    e.messageFr,
    e.messageAr,
    e.rawValue || '',
  ]);
  return buildFormulaSafeCsv(headers, rows);
}
