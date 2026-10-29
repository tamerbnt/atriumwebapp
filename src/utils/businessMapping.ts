import { BusinessCategory } from '../types/index';

export interface BusinessMatchResult {
  category: BusinessCategory;
  matchedKeyword: string;
  categoryTitle: string;
  categoryTagline: string;
}

export interface BusinessCategoryInfo {
  id: BusinessCategory;
  title: string;
  tagline: string;
  keywords: string[];
}

export const CATEGORY_METADATA: Record<
  BusinessCategory,
  { title: string; tagline: string; sampleKeywords: string[] }
> = {
  membership_session: {
    title: 'Membership',
    tagline: 'RFID Turnstiles, Subscriptions & Session Plans',
    sampleKeywords: ['CrossFit Club', 'Martial Arts Dojo', 'Pilates Studio', 'Boxing Club'],
  },
  appointment_service: {
    title: 'Appointment',
    tagline: 'Stylist Timetables, Chair Bookings & Treatment Packs',
    sampleKeywords: ['Barbershop', 'Hair Salon', 'Day Spa', 'Aesthetic Clinic'],
  },
  pos_inventory: {
    title: 'Restaurant & POS Retail',
    tagline: 'Quick Orders, Tables, Inventory & High-Speed POS',
    sampleKeywords: ['Specialty Café', 'Pizzeria', 'Bakery / Pâtisserie', 'Retail Boutique'],
  },
  project_milestone: {
    title: 'Projects & Agency',
    tagline: 'Retainers, Client Accounts & Milestone Deliverables',
    sampleKeywords: ['Design Agency', 'Law Firm', 'Architecture Bureau', 'Consulting Practice'],
  },
  rental_booking: {
    title: 'Rentals, Coworking & Venue',
    tagline: 'Space Occupancy, Hourly Time Slots & Asset Leases',
    sampleKeywords: ['Coworking Hub', 'Event Venue / Salle des Fêtes', 'Photo Studio', 'Gear Rental'],
  },
  education_cohort: {
    title: 'Education, Academy & Tutoring',
    tagline: 'Cohort Timetables, Tuition Packs & Enrollments',
    sampleKeywords: ['Coding Bootcamp', 'Language Academy', 'Tutoring Center', 'Driving School'],
  },
  freelance_solo: {
    title: 'Freelancers & Solo Practice',
    tagline: 'Floating Stopwatch, Pomodoro, Retainers & 1-Click Invoicing',
    sampleKeywords: ['Full-Stack Dev', 'UI/UX Designer', 'Video Editor', 'Solo Consultant'],
  },
  trading_commercial: {
    title: 'Commercial Trading & Wholesale',
    tagline: 'Quotes, Delivery Slips, Supplier POs & Multi-Depot Stock',
    sampleKeywords: ['Wholesaler / Grossiste', 'Distributor SARL', 'Quincaillerie Gros', 'Import / Export'],
  },
  medical_clinic: {
    title: 'Medical Clinic & Health Practice',
    tagline: 'Patient Records, Vitals, Consultations & Prescriptions',
    sampleKeywords: ['General Practice', 'Dental Clinic', 'Cabinet Médical', 'Pediatrics'],
  },
  auto_garage: {
    title: 'Automotive Garage & Fleet Repair',
    tagline: 'Repair Orders, Inspections, Vehicle Intake & Diagnostics',
    sampleKeywords: ['Auto Repair', 'Mécanique Générale', 'Vidange & Pneus', 'Tôlerie & Peinture'],
  },
  real_estate: {
    title: 'Real Estate Agency & Brokerage',
    tagline: 'Property Listings, Mandates, Client Inquiries & Leases',
    sampleKeywords: ['Agence Immobilière', 'Property Broker', 'Location & Vente', 'Promoteur'],
  },
  manufacturing_production: {
    title: 'Manufacturing & Workshop Production',
    tagline: 'Bill of Materials, Work Orders, Batches & QC Checklists',
    sampleKeywords: ['Atelier Fabrication', 'Menuiserie Alu/Bois', 'Confection Textile', 'Packaging'],
  },
  legal_accounting: {
    title: 'Legal Cabinet, Notary & Accounting',
    tagline: 'Case Dossiers, Court Hearings, Timesheets & Retainers',
    sampleKeywords: ['Avocat à la Cour', 'Cabinet Comptable', 'Notaire', 'Commissaire aux Comptes'],
  },
  logistics_delivery: {
    title: 'Logistics, Couriers & Delivery',
    tagline: 'Parcel Tracking, Run Sheets, Driver Manifests & Cash on Delivery',
    sampleKeywords: ['Livraison Express', 'Courier Hub', 'Transport Marchandises', 'Messagerie COD'],
  },
  construction_contractor: {
    title: 'Construction & BTP Contracting',
    tagline: 'Site Progress, BOQ Devis, Guarantees & Provisional Handover',
    sampleKeywords: ['Entreprise BTP', 'Génie Civil', 'Travaux Publics', 'Second Œuvre'],
  },
  agriculture_farming: {
    title: 'Agri-Business & Livestock Farming',
    tagline: 'Crop Parcels, Harvest Scales, Irrigation & Livestock Tagging',
    sampleKeywords: ['Exploitation Agricole', 'Ferme Élevage', 'Arboriculture & Vergers', 'Céréaliculture'],
  },
};

/**
 * Curated inverted index with 120+ business terms, specialties, and multi-lingual synonyms (EN & FR)
 */
export const BUSINESS_KEYWORDS_MAP: Record<BusinessCategory, string[]> = {
  membership_session: [
    'gym',
    'fitness',
    'salle de sport',
    'crossfit',
    'cross fit',
    'workout',
    'bodybuilding',
    'musculation',
    'martial arts',
    'arts martiaux',
    'karate',
    'judo',
    'bjj',
    'jiu jitsu',
    'boxing',
    'boxe',
    'kickboxing',
    'mma',
    'muay thai',
    'taekwondo',
    'yoga',
    'yoga studio',
    'pilates',
    'personal trainer',
    'coach sportif',
    'coaching',
    'swimming',
    'swimming pool',
    'piscine',
    'tennis',
    'tennis club',
    'padel',
    'padel club',
    'athletics',
    'athletic club',
    'gymnase',
    'club sportif',
    'calisthenics',
    'powerlifting',
    'spin class',
    'spinning',
    'cycling studio',
    'aerobics',
    'zumba',
    'dance studio',
    'ecole de danse',
    'fitness center',
    'جيم',
    'قاعة رياضة',
    'نادي رياضي',
    'كمال أجسام',
    'فيتنس',
    'ملاكمة',
    'كاراتيه',
    'سباحة',
    'مسبح',
    'رياضة',
  ],

  appointment_service: [
    'barber',
    'barbershop',
    'coiffeur',
    'coiffure',
    'salon de coiffure',
    'hair salon',
    'hairdresser',
    'hair studio',
    'beauty',
    'beauty salon',
    'salon de beaute',
    'spa',
    'day spa',
    'massage',
    'massothérapeute',
    'nails',
    'nail salon',
    'onglerie',
    'manicure',
    'pedicure',
    'manucure',
    'pedicure',
    'lash',
    'lash bar',
    'eyelash',
    'cils',
    'esthetique',
    'aesthetician',
    'esthetique medicale',
    'facial',
    'soins du visage',
    'tanning',
    'bronzage',
    'makeup',
    'maquillage',
    'tattoo',
    'tattoo parlor',
    'tatouage',
    'piercing',
    'institut de beaute',
    'hammam',
    'barber shop',
    'حلاق',
    'صالون حلاقة',
    'حلاقة',
    'كوافير',
    'صالون تجميل',
    'تجميل',
    'سبا',
    'مساج',
    'عيادة',
    'طبيب أسنان',
    'عيادة أسنان',
  ],

  pos_inventory: [
    'restaurant',
    'resto',
    'cafe',
    'café',
    'coffee',
    'coffee shop',
    'cafeteria',
    'bistro',
    'bistrot',
    'pizzeria',
    'pizza',
    'burger',
    'burger joint',
    'fast food',
    'snack',
    'bakery',
    'boulangerie',
    'pastry',
    'patisserie',
    'pâtisserie',
    'viennoiserie',
    'grocery',
    'grocery store',
    'epicerie',
    'épicerie',
    'superette',
    'supérette',
    'supermarket',
    'boutique',
    'retail',
    'commerce',
    'store',
    'shop',
    'clothing',
    'clothing store',
    'magasin de vetements',
    'pret a porter',
    'shoes',
    'magasin de chaussures',
    'bar',
    'lounge',
    'tea salon',
    'salon de the',
    'creperie',
    'crêperie',
    'boucherie',
    'butcher',
    'charcuterie',
    'fishmonger',
    'poissonnerie',
    'fleuriste',
    'florist',
    'optician',
    'opticien',
    'pharmacy',
    'chocolaterie',
    'food truck',
    'ice cream',
    'glacier',
    'مطعم',
    'مقهى',
    'كافيه',
    'بيتزا',
    'مخبزة',
    'مخبز',
    'حلويات',
    'باتيسري',
    'سوبرماركت',
    'بقالة',
    'متجر',
    'محل',
    'ملابس',
  ],

  project_milestone: [
    'agency',
    'agence',
    'marketing',
    'digital agency',
    'marketing agency',
    'agence de communication',
    'advertising',
    'design agency',
    'design studio',
    'architecture',
    'architecte',
    'cabinet d architecture',
    'interior design',
    'architecte d interieur',
    'cabinet',
    'law firm',
    'lawyer',
    'avocat',
    'cabinet d avocat',
    'legal',
    'juridique',
    'notary',
    'notaire',
    'consulting',
    'conseil',
    'consultant',
    'management consulting',
    'strategy',
    'engineering',
    'ingenierie',
    'bureau d etudes',
    'accounting',
    'accounting firm',
    'comptable',
    'expert comptable',
    'audit',
    'pr agency',
    'public relations',
    'production house',
    'audiovisual',
    'boite de comm',
    'software house',
    'it services',
    'وكالة',
    'وكالة تسويق',
    'وكالة إشهار',
    'مكتب دراسات',
    'مكتب محاماة',
    'محاماة',
    'استشارات',
    'هندسة معمارية',
    'مكتب هندسة',
  ],

  rental_booking: [
    'coworking',
    'coworking space',
    'espace de coworking',
    'venue',
    'event venue',
    'salle des fetes',
    'salle de fete',
    'wedding venue',
    'salle de mariage',
    'conference room',
    'salle de reunion',
    'meeting room',
    'photo studio',
    'studio photo',
    'photography studio',
    'sound studio',
    'recording studio',
    'studio d enregistrement',
    'equipment rental',
    'location materiel',
    'gear rental',
    'camera rental',
    'car rental',
    'location de voiture',
    'rent a car',
    'space rental',
    'location d espace',
    'warehouse',
    'entrepot',
    'depot',
    'dark kitchen',
    'storage',
    'self storage',
    'airbnb',
    'holiday rental',
    'location vacances',
    'كراء',
    'تأجير',
    'مساحة عمل',
    'مساحة عمل مشتركة',
    'كووركينج',
    'استوديو',
    'قاعة حفلات',
    'قاعة مناسبات',
    'تأجير سيارات',
  ],

  education_cohort: [
    'school',
    'ecole',
    'academy',
    'academie',
    'bootcamp',
    'coding bootcamp',
    'training',
    'training center',
    'centre de formation',
    'formation professionnelle',
    'institute',
    'institut',
    'language school',
    'ecole de langues',
    'cours de langue',
    'english school',
    'tuition',
    'tutoring',
    'cours de soutien',
    'soutien scolaire',
    'after school',
    'university',
    'college',
    'driving school',
    'auto ecole',
    'auto-ecole',
    'creche',
    'crèche',
    'daycare',
    'garderie',
    'preschool',
    'maternelle',
    'music school',
    'ecole de musique',
    'art school',
    'culinary school',
    'cours particuliers',
    'مدرسة',
    'معهد',
    'أكاديمية',
    'دروس دعم',
    'تعليم لغات',
    'مدرسة لغات',
    'برمجة',
    'تعليم السياقة',
    'مدرسة سياقة',
    'تدريب',
  ],

  freelance_solo: [
    'freelance',
    'freelancer',
    'solo',
    'solo practice',
    'independent',
    'independant',
    'indépendant',
    'dev',
    'developer',
    'developpeur',
    'software engineer',
    'programmer',
    'full stack',
    'frontend',
    'backend',
    'web designer',
    'web design',
    'ui designer',
    'ux designer',
    'ui ux',
    'graphic designer',
    'graphiste',
    'motion designer',
    'copywriter',
    'redacteur',
    'redactrice',
    'translator',
    'traducteur',
    'traduction',
    'video editor',
    'monteur video',
    'montage video',
    'solo consultant',
    'advisor',
    'consultant solo',
    'photographer',
    'photographe',
    'videographer',
    'community manager',
    'growth hacker',
    'remote worker',
    'tele-travailleur',
    'artisan',
    'artisan solo',
    'عمل حر',
    'مستقل',
    'فريلانسر',
    'مصمم',
    'مبرمج',
    'مطور',
    'كاتب محتوى',
    'مونتير',
  ],
  trading_commercial: [
    'negoce',
    'négoce',
    'grossiste',
    'wholesale',
    'distributeur',
    'distribution',
    'import export',
    'commerce de gros',
    'quincaillerie gros',
    'materiaux de construction',
    'fournisseur',
    'b2b',
    'btp fourniture',
    'depot de stockage',
    'entrepot',
    'entrepôt',
    'commercial trading',
    'vente en gros',
    'bon de commande',
    'bon de livraison',
    'devis facture',
    'تجارة الجملة',
    'مستودع',
    'توزيع',
    'استيراد وتصدير',
    'مواد البناء',
  ],

  medical_clinic: [
    'doctor',
    'clinic',
    'medical',
    'medecin',
    'cabinet medical',
    'dentist',
    'dentiste',
    'dentaire',
    'cabinet dentaire',
    'dental clinic',
    'pediatre',
    'physiotherapy',
    'physio',
    'kine',
    'kinesitherapie',
    'chiropractor',
    'osteopathe',
    'dermatology',
    'dermatologue',
    'consultation',
    'ordonnance',
    'sante',
    'health',
    'clinique',
    'soins medicaux',
    'طبيب',
    'عيادة',
    'صحة',
    'طب',
    'أسنان',
    'طبيب أسنان',
  ],

  auto_garage: [
    'garage',
    'auto',
    'mecanique',
    'car repair',
    'vidange',
    'tolerie',
    'diagnostic auto',
    'reparation auto',
    'mecanicien',
    'pneus',
    'مرآب',
    'ميكانيك',
    'سيارات',
    'تصليح سيارات',
  ],

  real_estate: [
    'real estate',
    'immobilier',
    'agence immobiliere',
    'location',
    'vente appartement',
    'villa',
    'courtier',
    'property',
    'promoteur',
    'عقارات',
    'وكالة عقارية',
    'كراء',
    'شقق',
  ],

  manufacturing_production: [
    'manufacturing',
    'production',
    'usine',
    'atelier',
    'fabrication',
    'bill of materials',
    'nomenclature',
    'usinage',
    'workshop',
    'menuiserie',
    'تصنيع',
    'إنتاج',
    'ورشة',
    'مصنع',
  ],

  legal_accounting: [
    'avocat',
    'lawyer',
    'notaire',
    'comptable',
    'cabinet comptable',
    'expertise comptable',
    'notary',
    'juridique',
    'tribunal',
    'barreau',
    'محامي',
    'موثق',
    'محاسب',
    'قانون',
  ],

  logistics_delivery: [
    'logistics',
    'delivery',
    'livraison',
    'coursier',
    'colis',
    'transport',
    'shipping',
    'cod',
    'fret',
    'messagerie',
    'توصيل',
    'شحن',
    'لوجستيك',
    'طرود',
  ],

  construction_contractor: [
    'btp',
    'construction',
    'chantier',
    'travaux publics',
    'genie civil',
    'contractor',
    'batiment',
    'second oeuvre',
    'gros oeuvre',
    'مقاولات',
    'بناء',
    'أشغال عمومية',
    'ورشة بناء',
  ],

  agriculture_farming: [
    'agriculture',
    'ferme',
    'recolte',
    'elevage',
    'agricole',
    'parcelle',
    'serre',
    'cheptel',
    'farming',
    'crops',
    'arboriculture',
    'فلاحة',
    'مزرعة',
    'محصول',
    'تربية مواشي',
  ],
};

export const POPULAR_BUSINESS_SEARCHES = [
  { label: 'Barbershop / Salon', query: 'barbershop', category: 'appointment_service' as BusinessCategory },
  { label: 'CrossFit / Gym', query: 'crossfit gym', category: 'membership_session' as BusinessCategory },
  { label: 'Café & Restaurant', query: 'cafe restaurant', category: 'pos_inventory' as BusinessCategory },
  { label: 'Freelance & Solo', query: 'freelance dev', category: 'freelance_solo' as BusinessCategory },
  { label: 'Agency & Projects', query: 'marketing agency', category: 'project_milestone' as BusinessCategory },
  { label: 'Coworking / Venue', query: 'coworking space', category: 'rental_booking' as BusinessCategory },
  { label: 'Academy & Training', query: 'language school', category: 'education_cohort' as BusinessCategory },
  { label: 'Wholesale & Trading', query: 'wholesale distributor', category: 'trading_commercial' as BusinessCategory },
  { label: 'Clinic & Doctors', query: 'cabinet medical clinic', category: 'medical_clinic' as BusinessCategory },
  { label: 'Auto Garage & Repair', query: 'garage automobile mecanique', category: 'auto_garage' as BusinessCategory },
  { label: 'Real Estate Agency', query: 'agence immobiliere', category: 'real_estate' as BusinessCategory },
  { label: 'Factory & Workshop', query: 'usine atelier fabrication production', category: 'manufacturing_production' as BusinessCategory },
  { label: 'Law & Accounting Firm', query: 'cabinet avocat comptable', category: 'legal_accounting' as BusinessCategory },
  { label: 'Delivery & Logistics', query: 'livraison express colis transport', category: 'logistics_delivery' as BusinessCategory },
  { label: 'Construction & BTP', query: 'entreprise btp travaux publics chantier', category: 'construction_contractor' as BusinessCategory },
  { label: 'Agriculture & Farm', query: 'exploitation agricole ferme elevage', category: 'agriculture_farming' as BusinessCategory },
];

export const getPopularBusinessSearches = (lang: string = 'en') => {
  if (lang === 'ar') {
    return [
      { label: 'صالون حلاقة وتجميل', query: 'صالون حلاقة', category: 'appointment_service' as BusinessCategory },
      { label: 'قاعة رياضة وفيتنس', query: 'قاعة رياضة', category: 'membership_session' as BusinessCategory },
      { label: 'مطعم ومقهى', query: 'مطعم مقهى', category: 'pos_inventory' as BusinessCategory },
      { label: 'عمل حر وبرمجة', query: 'مبرمج مستقل', category: 'freelance_solo' as BusinessCategory },
      { label: 'وكالة إشهار واستشارات', query: 'وكالة تسويق', category: 'project_milestone' as BusinessCategory },
      { label: 'مساحة عمل واستوديو', query: 'مساحة عمل', category: 'rental_booking' as BusinessCategory },
      { label: 'مدرسة لغات وتكوين', query: 'مدرسة لغات', category: 'education_cohort' as BusinessCategory },
      { label: 'تجارة وتوزيع بالجملة', query: 'تجارة الجملة', category: 'trading_commercial' as BusinessCategory },
      { label: 'عيادة ومركز طبي', query: 'عيادة طبية', category: 'medical_clinic' as BusinessCategory },
      { label: 'ورشة ميكانيك وتصليح سيارات', query: 'مرآب سيارات', category: 'auto_garage' as BusinessCategory },
      { label: 'وكالة عقارية وكراء', query: 'وكالة عقارية', category: 'real_estate' as BusinessCategory },
      { label: 'مصنع وورشة إنتاج', query: 'مصنع انتاج', category: 'manufacturing_production' as BusinessCategory },
      { label: 'مكتب محاماة ومحاسبة', query: 'مكتب محاماة', category: 'legal_accounting' as BusinessCategory },
      { label: 'توصيل سريع وطرود', query: 'توصيل طرود', category: 'logistics_delivery' as BusinessCategory },
      { label: 'مقاولات بناء وأشغال عمومية', query: 'مقاولات بناء', category: 'construction_contractor' as BusinessCategory },
      { label: 'مستثمرة فلاحية وتربية مواشي', query: 'مزرعة فلاحية', category: 'agriculture_farming' as BusinessCategory },
    ];
  }
  if (lang === 'fr') {
    return [
      { label: 'Salon de coiffure & Spa', query: 'salon de coiffure', category: 'appointment_service' as BusinessCategory },
      { label: 'Salle de sport & Fitness', query: 'salle de sport', category: 'membership_session' as BusinessCategory },
      { label: 'Café & Restaurant', query: 'cafe restaurant', category: 'pos_inventory' as BusinessCategory },
      { label: 'Freelance Dev & Design', query: 'freelance dev', category: 'freelance_solo' as BusinessCategory },
      { label: 'Agence Marketing & Conseil', query: 'agence marketing', category: 'project_milestone' as BusinessCategory },
      { label: 'Coworking & Studios', query: 'coworking', category: 'rental_booking' as BusinessCategory },
      { label: 'École de langues & Formation', query: 'ecole de langues', category: 'education_cohort' as BusinessCategory },
      { label: 'Négoce & Vente en Gros', query: 'negoce distribution', category: 'trading_commercial' as BusinessCategory },
      { label: 'Cabinet Médical & Clinique', query: 'cabinet medical', category: 'medical_clinic' as BusinessCategory },
      { label: 'Garage & Réparation Auto', query: 'garage mecanique', category: 'auto_garage' as BusinessCategory },
      { label: 'Agence Immobilière & Baux', query: 'agence immobiliere', category: 'real_estate' as BusinessCategory },
      { label: 'Atelier & Usine Fabrication', query: 'atelier usine', category: 'manufacturing_production' as BusinessCategory },
      { label: 'Cabinet Avocat & Notaire', query: 'cabinet avocat', category: 'legal_accounting' as BusinessCategory },
      { label: 'Livraison Express & Messagerie', query: 'livraison express', category: 'logistics_delivery' as BusinessCategory },
      { label: 'BTP, Chantier & Travaux Publics', query: 'btp chantier', category: 'construction_contractor' as BusinessCategory },
      { label: 'Exploitation Agricole & Domaine', query: 'ferme agricole', category: 'agriculture_farming' as BusinessCategory },
    ];
  }
  return POPULAR_BUSINESS_SEARCHES;
};

/**
 * Normalize search string: lowercase, remove accents/diacritics and special punctuation
 * Retains Latin alphanumeric characters and Arabic Unicode range (\u0600-\u06FF)
 */
export function normalizeSearchToken(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Given any freeform user input (e.g. "barbershop", "crossfit", "pâtisserie", "ui designer"),
 * find the highest-confidence matching business vertical.
 */
export function findCategoryByBusinessSearch(rawQuery: string): BusinessMatchResult | null {
  const query = normalizeSearchToken(rawQuery);
  if (!query || query.length < 2) return null;

  const queryTokens = query.split(' ').filter(Boolean);

  let bestMatch: BusinessMatchResult | null = null;
  let highestScore = 0;

  for (const [categoryKey, keywords] of Object.entries(BUSINESS_KEYWORDS_MAP)) {
    const category = categoryKey as BusinessCategory;
    const meta = CATEGORY_METADATA[category];

    for (const kw of keywords) {
      const normalizedKw = normalizeSearchToken(kw);

      // Exact phrase match (highest weight)
      if (normalizedKw === query) {
        return {
          category,
          matchedKeyword: kw,
          categoryTitle: meta.title,
          categoryTagline: meta.tagline,
        };
      }

      // Query includes the full keyword or vice-versa
      if (query.includes(normalizedKw) || normalizedKw.includes(query)) {
        const score = 80 + (normalizedKw.length / (query.length + 1)) * 15;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            category,
            matchedKeyword: kw,
            categoryTitle: meta.title,
            categoryTagline: meta.tagline,
          };
        }
      }

      // Multi-token overlap scoring
      const kwTokens = normalizedKw.split(' ');
      const matchCount = queryTokens.filter((token) =>
        kwTokens.some((kt) => kt.startsWith(token) || token.startsWith(kt))
      ).length;

      if (matchCount > 0) {
        const score = (matchCount / queryTokens.length) * 70;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            category,
            matchedKeyword: kw,
            categoryTitle: meta.title,
            categoryTagline: meta.tagline,
          };
        }
      }
    }
  }

  return bestMatch;
}

export type OnboardingTeamScale = 'solo' | 'small' | 'mid' | 'large';

export interface OnboardingTeamScaleOption {
  id: OnboardingTeamScale;
  label: { fr: string; ar: string; en: string };
  range: { fr: string; ar: string; en: string };
  desc: { fr: string; ar: string; en: string };
  iconName: string;
}

export const ONBOARDING_TEAM_SCALES: OnboardingTeamScaleOption[] = [
  {
    id: 'solo',
    label: { fr: 'Solo / Indépendant', ar: 'مستقل / فردي', en: 'Solo / Independent' },
    range: { fr: '1 personne', ar: 'شخص واحد', en: '1 person' },
    desc: {
      fr: 'Freelance, artisan, consultant ou profession libérale exerçant seul.',
      ar: 'عمل حر، حرفي، مستشار أو صاحب مهنة حرة بمفرده.',
      en: 'Freelancer, artisan, consultant or solo practitioner.',
    },
    iconName: 'User',
  },
  {
    id: 'small',
    label: { fr: 'Petite équipe', ar: 'فريق مصغر', en: 'Small Team' },
    range: { fr: '2 à 5 personnes', ar: '2 إلى 5 أفراد', en: '2 to 5 people' },
    desc: {
      fr: 'Cabinet, boutique, salon ou atelier avec collaborateurs directs.',
      ar: 'مكتب، متجر، صالون أو ورشة عمل مع معاونين مباشرين.',
      en: 'Boutique, clinic, salon or studio with core team members.',
    },
    iconName: 'Users',
  },
  {
    id: 'mid',
    label: { fr: 'PME en expansion', ar: 'مؤسسة متوسطة', en: 'Mid-sized Enterprise' },
    range: { fr: '6 à 20 personnes', ar: '6 إلى 20 فرداً', en: '6 to 20 people' },
    desc: {
      fr: 'Établissement structuré avec plusieurs rôles, caisses et postes.',
      ar: 'منشأة منظمة بعدة أدوار وصناديق ومحطات تشغيل.',
      en: 'Structured operation with multiple staff roles, registers and desks.',
    },
    iconName: 'Building2',
  },
  {
    id: 'large',
    label: { fr: 'Grande structure', ar: 'مؤسسة كبرى / مصنع', en: 'Large Organization' },
    range: { fr: '20+ personnes', ar: 'أكثر من 20 فرداً', en: '20+ people' },
    desc: {
      fr: 'Usine, grossiste, société BTP ou réseau multi-sites / dépôts.',
      ar: 'مصنع، تاجر جملة، شركة مقاولات أو شبكة متعددة الفروع والمخازن.',
      en: 'Factory, wholesale distributor, construction firm or multi-depot network.',
    },
    iconName: 'Factory',
  },
];

export interface OnboardingModuleOption {
  id: string;
  label: { fr: string; ar: string; en: string };
  desc: { fr: string; ar: string; en: string };
  iconName: string;
  affinities: Partial<Record<BusinessCategory, number>>;
  keyFeature: { fr: string; ar: string; en: string };
}

export const ONBOARDING_MODULE_OPTIONS: OnboardingModuleOption[] = [
  {
    id: 'pos_cashier',
    label: { fr: 'Caisse & Vente Comptoir', ar: 'نقطة البيع والصندوق السريع', en: 'POS Register & Counter Sales' },
    desc: {
      fr: 'Écran tactile, encaissement rapide, rendu de monnaie et tickets de caisse.',
      ar: 'شاشة لمس سريعة، قبض نقدي، إرجاع الباقي وطباعة الوصولات.',
      en: 'High-speed touch terminal, change calculator and thermal receipt printing.',
    },
    iconName: 'Utensils',
    affinities: { pos_inventory: 40, appointment_service: 20, membership_session: 15, trading_commercial: 25 },
    keyFeature: { fr: 'Caisse tactile & Tickets', ar: 'صندوق بيع حراري سريع', en: 'Touch POS & Receipts' },
  },
  {
    id: 'invoicing_quotes',
    label: { fr: 'Facturation, Devis & Dettes', ar: 'الفواتير وعروض الأسعار والديون', en: 'Invoicing, Quotes & Payables' },
    desc: {
      fr: 'Génération de devis proforma, factures avec TVA, suivi des créances et règlements.',
      ar: 'إصدار الفواتير الرسمية وعروض الأسعار ومتابعة مستحقات الزبائن.',
      en: 'Proforma quotes, VAT invoices, client ledger and debt tracking.',
    },
    iconName: 'Briefcase',
    affinities: {
      trading_commercial: 40,
      freelance_solo: 35,
      project_milestone: 35,
      legal_accounting: 35,
      construction_contractor: 35,
      manufacturing_production: 30,
    },
    keyFeature: { fr: 'Factures proforma & Devis', ar: 'فواتير رسمية وعروض أسعار', en: 'Proforma & Tax Invoicing' },
  },
  {
    id: 'appointments_agenda',
    label: { fr: 'Prise de Rendez-vous & Planning', ar: 'حجز المواعيد وجدول الأوقات', en: 'Appointments & Timetables' },
    desc: {
      fr: 'Gestion des créneaux horaires, attribution par collaborateur / fauteuil et rappels.',
      ar: 'حجز فترات زمنية، توزيع على الكراسي والممارسين مع تنبيهات تلقائية.',
      en: 'Time slot reservations, chair allocation and automated appointment reminders.',
    },
    iconName: 'Scissors',
    affinities: { appointment_service: 45, medical_clinic: 40, auto_garage: 25, legal_accounting: 20, rental_booking: 15 },
    keyFeature: { fr: 'Planning créneaux & Fauteuils', ar: 'حجز كراسي وجدول مواعيد', en: 'Chair & Time Slot Booking' },
  },
  {
    id: 'memberships_rfid',
    label: { fr: 'Abonnements & Cartes RFID', ar: 'الاشتراكات وشارات الدخول الذكية', en: 'Subscriptions & RFID Badges' },
    desc: {
      fr: 'Formules mensuelles/annuelles, carnets de séances et contrôle d’accès aux tourniquets.',
      ar: 'باقات شهرية وحصص مع التحكم في البوابات وشارات RFID.',
      en: 'Monthly/annual passes, session packs and turnstile access control.',
    },
    iconName: 'Dumbbell',
    affinities: { membership_session: 45, rental_booking: 20, education_cohort: 25 },
    keyFeature: { fr: 'Tourniquets RFID & Forfaits', ar: 'بوابات ذكية واشتراكات دورية', en: 'RFID Access & Memberships' },
  },
  {
    id: 'inventory_stock',
    label: { fr: 'Gestion de Stock Multi-Dépôts', ar: 'إدارة المخزون والمستودعات المتعددة', en: 'Multi-Depot Stock & Inventory' },
    desc: {
      fr: 'Entrées/sorties, alertes de réapprovisionnement, codes-barres et valorisation.',
      ar: 'حركات السلع، تنبيهات نفاد المخزون، الباركود وتقييم رأس المال.',
      en: 'Barcode stock movements, reorder alerts and warehouse valuation.',
    },
    iconName: 'Building2',
    affinities: {
      trading_commercial: 40,
      pos_inventory: 35,
      manufacturing_production: 35,
      auto_garage: 30,
      agriculture_farming: 20,
    },
    keyFeature: { fr: 'Stock & Code-barres', ar: 'جرد مستودعات وباركود', en: 'Barcode & Depot Control' },
  },
  {
    id: 'timetracker_pomodoro',
    label: { fr: 'Chronomètre & Taux Horaire', ar: 'مؤقت العمل وساعات الفوترة', en: 'Time Tracker & Billable Hours' },
    desc: {
      fr: 'Stopwatch flottant, sessions Pomodoro, taux horaire et facturation en 1 clic.',
      ar: 'مؤقت عمل عائم، فترات تركيز، سعر الساعة والفوترة المباشرة.',
      en: 'Floating stopwatch, Pomodoro sessions, hourly rates and 1-click billing.',
    },
    iconName: 'Laptop',
    affinities: { freelance_solo: 45, project_milestone: 30, legal_accounting: 25 },
    keyFeature: { fr: 'Stopwatch & Pomodoro', ar: 'مؤقت عمل وفوترة بالساعة', en: 'Stopwatch & Pomodoro' },
  },
  {
    id: 'patient_records',
    label: { fr: 'Dossiers Patients & Santé', ar: 'ملفات المرضى والاستشارات الطبية', en: 'Patient Records & Healthcare' },
    desc: {
      fr: 'Historique médical, constantes vitales, ordonnances et file d’attente salle de soins.',
      ar: 'سجل الفحوصات، المؤشرات الحيوية، الوصفات الطبية وقاعة الانتظار.',
      en: 'Medical history, vitals triage, prescriptions and patient consultation flow.',
    },
    iconName: 'Stethoscope',
    affinities: { medical_clinic: 50 },
    keyFeature: { fr: 'Constantes vitales & Ordonnances', ar: 'مؤشرات حيوية ووصفات طبية', en: 'Vitals & Prescriptions' },
  },
  {
    id: 'repair_orders',
    label: { fr: 'Ordres de Réparation & Véhicules', ar: 'أوامر تصليح المركبات وقطع الغيار', en: 'Repair Orders & Fleet Intake' },
    desc: {
      fr: 'Fiches OR, immatriculation, kilométrage, diagnostic OBD-II et pièces atelier.',
      ar: 'بطاقة أمر التصليح، رقم اللوحة، تشخيص الأعطال وقطع الغيار.',
      en: 'Repair orders (OR), plate registration, OBD diagnostics and parts registry.',
    },
    iconName: 'Wrench',
    affinities: { auto_garage: 50 },
    keyFeature: { fr: 'Fiches OR & Pièces détachées', ar: 'أوامر تصليح وقطع غيار', en: 'Work Orders & Parts Registry' },
  },
  {
    id: 'property_leases',
    label: { fr: 'Baux Immobiliers & Mandats', ar: 'العقود العقارية وإدارة الإيجارات', en: 'Real Estate Leases & Mandates' },
    desc: {
      fr: 'Biens en location/vente, états des lieux, baux notariés et relances loyers.',
      ar: 'سجل العقارات المعروضة، عقود الإيجار، محاضر المعاينة والتحصيل.',
      en: 'Property listings, lease contracts, inspection logs and rent collection.',
    },
    iconName: 'Home',
    affinities: { real_estate: 50 },
    keyFeature: { fr: 'Baux locatifs & États des lieux', ar: 'عقود إيجار ومحاضر معاينة', en: 'Leases & Property Listings' },
  },
  {
    id: 'manufacturing_bom',
    label: { fr: 'Nomenclatures & Ordres Usine', ar: 'أوامر التصنيع ومخططات الإنتاج (BOM)', en: 'Production BOM & Work Orders' },
    desc: {
      fr: 'Décomposition des matières premières (BOM), ordres de fabrication et contrôle qualité.',
      ar: 'تفكيك المواد الأولية، جداول التصنيع ومراقبة الجودة في الورشة.',
      en: 'Bill of Materials (BOM), workshop work orders and batch QC checklists.',
    },
    iconName: 'Factory',
    affinities: { manufacturing_production: 50 },
    keyFeature: { fr: 'Nomenclatures BOM & Contrôle QC', ar: 'نمنكلاتور وتصنيع ومراقبة جودة', en: 'BOM & Workshop Batches' },
  },
  {
    id: 'legal_dossiers',
    label: { fr: 'Dossiers Juridiques & Audiences', ar: 'القضايا القانونية ومواعيد الجلسات', en: 'Legal Matters & Court Hearings' },
    desc: {
      fr: 'Affaires de justice, calendrier des audiences du tribunal, séquestre et honoraires.',
      ar: 'ملفات القضايا، جدول جلسات المحكمة، حسابات الأمانات وأتعاب المحاماة.',
      en: 'Case matters, court hearing calendar, trust accounting and legal retainers.',
    },
    iconName: 'Scale',
    affinities: { legal_accounting: 50 },
    keyFeature: { fr: 'Audiences tribunal & Séquestre', ar: 'جلسات المحكمة وحساب الأمانات', en: 'Court Hearings & Trust Vault' },
  },
  {
    id: 'logistics_cod',
    label: { fr: 'Colis, Tournées & Cash On Delivery', ar: 'توصيل الطرود والدفع عند الاستلام (COD)', en: 'Parcels, Manifests & Cash on Delivery' },
    desc: {
      fr: 'Numéros de suivi (AWB), manifestes de livraison pour livreurs et encaissement COD.',
      ar: 'تتبع الشحنات، أوراق جولة السائقين ومطابقة الأموال المحصلة عند التسليم.',
      en: 'AWB tracking, driver run sheets and COD cash reconciliation.',
    },
    iconName: 'Truck',
    affinities: { logistics_delivery: 50 },
    keyFeature: { fr: 'Manifestes livreurs & Suivi COD', ar: 'تتبع الشحنات والدفع عند الاستلام', en: 'Driver Manifests & COD Money' },
  },
  {
    id: 'construction_boq',
    label: { fr: 'Chantiers, Métrés & Attachements BTP', ar: 'متابعة الورشات والمقايسات (BOQ)', en: 'BTP Sites, BOQ & Progress Billings' },
    desc: {
      fr: 'Bordereaux des prix unitaires, situations de travaux avec retenue de garantie.',
      ar: 'دفاتر البنود والأسعار، مستخلصات الأشغال اليومية وكفالات حسن التنفيذ.',
      en: 'Bill of Quantities (BOQ), daily site logs and provisional progress billings.',
    },
    iconName: 'HardHat',
    affinities: { construction_contractor: 50 },
    keyFeature: { fr: 'Métrés BOQ & Situations BTP', ar: 'مقايسات أشغال وكشوفات تقدم', en: 'BOQ Devis & Progress Claims' },
  },
  {
    id: 'agriculture_crops',
    label: { fr: 'Cultures Agricoles & Élevage', ar: 'المحاصيل الزراعية وتربية المواشي', en: 'Crops, Harvests & Livestock' },
    desc: {
      fr: 'Parcelles, calendrier d’irrigation, pesées au marché de gros et identification bétail.',
      ar: 'المساحات المزروعة، دورات الري، تذاكر الوزن وسجل ترقيم المواشي.',
      en: 'Parcel cadastres, harvest weighing tickets and livestock ear-tag registry.',
    },
    iconName: 'Sprout',
    affinities: { agriculture_farming: 50 },
    keyFeature: { fr: 'Pesées récoltes & Parcelles', ar: 'أوزان المحاصيل وترقيم المواشي', en: 'Harvest Tickets & Cattle Tags' },
  },
  {
    id: 'venue_rentals',
    label: { fr: 'Location de Salles & Espaces', ar: 'كراء القاعات وفضاءات العمل المشترك', en: 'Venue Rentals & Coworking' },
    desc: {
      fr: 'Planning d’occupation horaire, états des lieux, matériel loué et dépôts de garantie.',
      ar: 'جدول حجز الساعات، استئجار المعدات والتجهيزات، وإدارة مبالغ الضمان.',
      en: 'Hourly slot occupancy, gear inventory leasing and refundable security deposits.',
    },
    iconName: 'Building2',
    affinities: { rental_booking: 50 },
    keyFeature: { fr: 'Occupancy & Dépôts de garantie', ar: 'حجز قاعات وإيداعات الضمان', en: 'Hourly Booking & Deposits' },
  },
  {
    id: 'cohorts_education',
    label: { fr: 'Promotions, Cours & Présences', ar: 'الأفواج الدراسية والحصص والغيابات', en: 'Cohorts, Timetables & Attendance' },
    desc: {
      fr: 'Inscriptions des élèves, emploi du temps des salles, relevé d’absences et attestations.',
      ar: 'تسجيل الطلاب، جداول القاعات والأساتذة، دفاتر الحضور وإصدار الشهادات.',
      en: 'Student enrollments, classroom schedule, attendance ledger and certificate issues.',
    },
    iconName: 'GraduationCap',
    affinities: { education_cohort: 50 },
    keyFeature: { fr: 'Emploi du temps & Présences', ar: 'أفواج دراسية وسجل الحضور', en: 'Cohorts & Attendance Ledger' },
  },
];

export interface RecommendationResult {
  recommendedCategory: BusinessCategory;
  confidencePercent: number;
  matchedReason: { fr: string; ar: string; en: string };
  matchingFeatures: Array<{ fr: string; ar: string; en: string }>;
  runnerUps: Array<{ category: BusinessCategory; confidencePercent: number }>;
}

export function calculateCategoryRecommendation(params: {
  activityCategory?: BusinessCategory | null;
  searchQuery?: string;
  selectedModuleIds: string[];
  teamScale?: OnboardingTeamScale;
}): RecommendationResult {
  const allCategories = Object.keys(CATEGORY_METADATA) as BusinessCategory[];
  const scores: Record<BusinessCategory, number> = {
    membership_session: 5,
    appointment_service: 5,
    pos_inventory: 5,
    project_milestone: 5,
    rental_booking: 5,
    education_cohort: 5,
    freelance_solo: 5,
    trading_commercial: 5,
    medical_clinic: 5,
    auto_garage: 5,
    real_estate: 5,
    manufacturing_production: 5,
    legal_accounting: 5,
    logistics_delivery: 5,
    construction_contractor: 5,
    agriculture_farming: 5,
  };

  // 1. Direct Activity Chip Selection (Weight: 45)
  if (params.activityCategory && scores[params.activityCategory] !== undefined) {
    scores[params.activityCategory] += 45;
  }

  // 2. Freeform Search Input (Weight: up to 35)
  if (params.searchQuery && params.searchQuery.trim().length >= 2) {
    const searchMatch = findCategoryByBusinessSearch(params.searchQuery);
    if (searchMatch) {
      scores[searchMatch.category] += 35;
    }
  }

  // 3. Operational Module Affinities
  const selectedModules = ONBOARDING_MODULE_OPTIONS.filter((m) =>
    params.selectedModuleIds.includes(m.id)
  );

  for (const mod of selectedModules) {
    for (const [cat, affinity] of Object.entries(mod.affinities)) {
      const c = cat as BusinessCategory;
      if (scores[c] !== undefined && affinity) {
        scores[c] += affinity * 0.75;
      }
    }
  }

  // 4. Team Scale Bonuses
  if (params.teamScale === 'solo') {
    scores.freelance_solo += 20;
    scores.appointment_service += 5;
  } else if (params.teamScale === 'small') {
    scores.appointment_service += 8;
    scores.pos_inventory += 8;
    scores.medical_clinic += 8;
    scores.auto_garage += 8;
  } else if (params.teamScale === 'mid') {
    scores.trading_commercial += 10;
    scores.pos_inventory += 10;
    scores.project_milestone += 10;
    scores.education_cohort += 10;
    scores.membership_session += 10;
  } else if (params.teamScale === 'large') {
    scores.trading_commercial += 15;
    scores.manufacturing_production += 15;
    scores.construction_contractor += 15;
    scores.logistics_delivery += 15;
  }

  // Sort descending by score
  const sorted = allCategories
    .map((cat) => ({ category: cat, score: scores[cat] }))
    .sort((a, b) => b.score - a.score);

  const best = sorted[0];
  const maxScore = Math.max(best.score, 1);
  const runnerUps = sorted.slice(1, 4).map((item) => ({
    category: item.category,
    confidencePercent: Math.min(99, Math.round((item.score / maxScore) * 88)),
  }));

  const recommendedCat = best.category;
  const bestMeta = CATEGORY_METADATA[recommendedCat];

  // Pick matching features from selected modules or vertical highlights
  const matchingFeatures: Array<{ fr: string; ar: string; en: string }> = [];
  for (const mod of selectedModules) {
    if (mod.affinities[recommendedCat]) {
      matchingFeatures.push(mod.keyFeature);
    }
  }

  if (matchingFeatures.length < 3) {
    // Fill from vertical metadata highlights
    matchingFeatures.push({
      fr: `Architecture adaptée : ${bestMeta.title}`,
      ar: `هيكلية مخصصة بالكامل : ${bestMeta.title}`,
      en: `Optimized layout for ${bestMeta.title}`,
    });
    matchingFeatures.push({
      fr: 'KPIs en temps réel & Piste d’audit',
      ar: 'مؤشرات أداء حية وسجل عمليات كامل',
      en: 'Real-time KPIs & full audit trail',
    });
    matchingFeatures.push({
      fr: 'Facturation & Conformité locale',
      ar: 'فوترة مطابقة للمعايير الوطنية',
      en: 'Billing & local compliance ready',
    });
  }

  const confidencePercent = Math.min(
    99,
    Math.max(82, Math.round(75 + (best.score / (sorted[1]?.score || 1)) * 12))
  );

  return {
    recommendedCategory: recommendedCat,
    confidencePercent,
    matchedReason: {
      fr: `Recommandé selon votre activité "${bestMeta.title}" et vos ${params.selectedModuleIds.length} modules opérationnels choisis.`,
      ar: `تم اقتراح هذا القطاع بناءً على نشاطك "${bestMeta.title}" والوحدات التشغيلية (${params.selectedModuleIds.length}) التي اخترتها.`,
      en: `Recommended based on your activity "${bestMeta.title}" and ${params.selectedModuleIds.length} selected operational modules.`,
    },
    matchingFeatures: matchingFeatures.slice(0, 4),
    runnerUps,
  };
}

// ============================================================================
// EXHAUSTIVE 16-VERTICAL BUSINESS ACTIVITY CATALOG (160+ REAL TRADES)
// ============================================================================

export interface CatalogBusinessTrade {
  id: string;
  category: BusinessCategory;
  name: { fr: string; ar: string; en: string };
  badge: { fr: string; ar: string; en: string };
  keywords: string[];
}

export const FULL_16_VERTICAL_CATALOG: CatalogBusinessTrade[] = [
  // 1. Membership & Athletics
  {
    id: 'trade_gym_fitness',
    category: 'membership_session',
    name: { fr: 'Salle de sport & Fitness', ar: 'قاعة رياضة ولياقة بدنية', en: 'Gym & Fitness Center' },
    badge: { fr: 'Abonnements', ar: 'اشتراكات', en: 'Memberships' },
    keywords: ['gym', 'fitness', 'salle de sport', 'workout', 'musculation', 'جيم', 'قاعة رياضة'],
  },
  {
    id: 'trade_crossfit',
    category: 'membership_session',
    name: { fr: 'Box CrossFit', ar: 'نادي كروس فيت', en: 'CrossFit Box' },
    badge: { fr: 'WOD / Séances', ar: 'حصص رياضية', en: 'Sessions' },
    keywords: ['crossfit', 'wod', 'wod training', 'كروس فيت'],
  },
  {
    id: 'trade_tennis_padel',
    category: 'membership_session',
    name: { fr: 'Club de Tennis & Padel', ar: 'نادي تنس وبادل', en: 'Tennis & Padel Club' },
    badge: { fr: 'Courts & Terrains', ar: 'ملاعب', en: 'Courts' },
    keywords: ['tennis', 'padel', 'court de tennis', 'تنس', 'بادل'],
  },
  {
    id: 'trade_martial_arts',
    category: 'membership_session',
    name: { fr: 'Dojo Karaté & Judo', ar: 'فنون قتالية وكاراتيه', en: 'Martial Arts & Judo Dojo' },
    badge: { fr: 'Dojo / Grades', ar: 'فنون قتالية', en: 'Dojo' },
    keywords: ['karate', 'judo', 'bjj', 'jiu jitsu', 'martial arts', 'كاراتيه', 'جودو'],
  },
  {
    id: 'trade_boxing_mma',
    category: 'membership_session',
    name: { fr: 'Club de Boxe & MMA', ar: 'نادي ملاكمة وMMA', en: 'Boxing & MMA Club' },
    badge: { fr: 'Combats / Rounds', ar: 'ملاكمة', en: 'Boxing' },
    keywords: ['boxe', 'boxing', 'mma', 'kickboxing', 'ملاكمة', 'قتال'],
  },
  {
    id: 'trade_yoga_pilates',
    category: 'membership_session',
    name: { fr: 'Studio Yoga & Pilates', ar: 'استوديو يوغا وبيلاطس', en: 'Yoga & Pilates Studio' },
    badge: { fr: 'Séances zen', ar: 'يوغا', en: 'Wellness' },
    keywords: ['yoga', 'pilates', 'zen', 'stretching', 'يوغا', 'بيلاطس'],
  },
  {
    id: 'trade_dance_school',
    category: 'membership_session',
    name: { fr: 'École de danse & Rythme', ar: 'مدرسة رقص وفنون حركية', en: 'Dance & Movement Studio' },
    badge: { fr: 'Chorégraphie', ar: 'رقص', en: 'Dance' },
    keywords: ['dance', 'danse', 'ballet', 'zumba', 'رقص'],
  },
  {
    id: 'trade_swimming_pool',
    category: 'membership_session',
    name: { fr: 'Piscine & Académie de Natation', ar: 'مسبح وأكاديمية سباحة', en: 'Swimming Pool & Academy' },
    badge: { fr: 'Bassin / Lignes', ar: 'سباحة', en: 'Pool' },
    keywords: ['swimming', 'piscine', 'natation', 'مسبح', 'سباحة'],
  },
  {
    id: 'trade_bodybuilding',
    category: 'membership_session',
    name: { fr: 'Salle de Musculation & Force', ar: 'قاعة كمال أجسام وقوة بدنية', en: 'Bodybuilding & Power Gym' },
    badge: { fr: 'Musculation', ar: 'كمال أجسام', en: 'Lifting' },
    keywords: ['bodybuilding', 'muscu', 'powerlifting', 'halterophilie', 'كمال أجسام'],
  },
  {
    id: 'trade_climbing',
    category: 'membership_session',
    name: { fr: 'Centre d’Athlétisme & Escalade', ar: 'مركز ألعاب قوى وتسلق', en: 'Climbing & Athletics Hub' },
    badge: { fr: 'Pistes & Murs', ar: 'تسلق', en: 'Athletics' },
    keywords: ['escalade', 'climbing', 'athletisme', 'تسلق'],
  },

  // 2. Appointment & Beauty
  {
    id: 'trade_barber',
    category: 'appointment_service',
    name: { fr: 'Barbershop & Coiffure Homme', ar: 'صالون حلاقة رجالي وعناية', en: "Men's Barbershop" },
    badge: { fr: 'Fauteuils', ar: 'حلاقة', en: 'Barber' },
    keywords: ['barber', 'barbershop', 'coiffeur homme', 'حلاق', 'حلاقة رجالي'],
  },
  {
    id: 'trade_hair_salon',
    category: 'appointment_service',
    name: { fr: 'Salon de Coiffure Femme', ar: 'صالون حلاقة نسائي', en: "Women's Hair Studio" },
    badge: { fr: 'Coiffure & Coloration', ar: 'كوافير نسائي', en: 'Hair Studio' },
    keywords: ['coiffure femme', 'hair salon', 'brushing', 'coloration', 'صالون حلاقة نسائي', 'كوافير'],
  },
  {
    id: 'trade_beauty_institute',
    category: 'appointment_service',
    name: { fr: 'Institut de Beauté & Soins', ar: 'معهد تجميل وعناية بالبشرة', en: 'Beauty Institute & Care' },
    badge: { fr: 'Soins Visage', ar: 'تجميل', en: 'Beauty' },
    keywords: ['institut de beaute', 'soins', 'facial', 'esthetique', 'معهد تجميل', 'صالون تجميل'],
  },
  {
    id: 'trade_nail_bar',
    category: 'appointment_service',
    name: { fr: 'Onglerie & Nail Bar', ar: 'صالون أظافر ومانيكير', en: 'Nail Bar & Pedicure Studio' },
    badge: { fr: 'Nails & Manucure', ar: 'أظافر', en: 'Nail Bar' },
    keywords: ['onglerie', 'nails', 'manucure', 'pedicure', 'أظافر', 'مانيكير'],
  },
  {
    id: 'trade_spa_hammam',
    category: 'appointment_service',
    name: { fr: 'Spa Urbain & Hammam Traditionnel', ar: 'حمام تقليدي وسبا استرخاء', en: 'Urban Spa & Bath House' },
    badge: { fr: 'Bains & Vapeur', ar: 'حمام وسبا', en: 'Spa' },
    keywords: ['spa', 'hammam', 'sauna', 'bain', 'massage', 'حمام', 'سبا', 'مساج'],
  },
  {
    id: 'trade_lash_bar',
    category: 'appointment_service',
    name: { fr: 'Bar à Cils & Sourcils', ar: 'صالون رموش وحواجب', en: 'Lash & Brow Lounge' },
    badge: { fr: 'Cils & Regard', ar: 'رموش', en: 'Lashes' },
    keywords: ['cils', 'lash', 'eyelash', 'sourcils', 'microblading', 'رموش', 'حواجب'],
  },
  {
    id: 'trade_tanning_studio',
    category: 'appointment_service',
    name: { fr: 'Centre de Bronzage', ar: 'مركز تسمير البشرة', en: 'Tanning Studio' },
    badge: { fr: 'Cabines UV', ar: 'تسمير', en: 'Tanning' },
    keywords: ['bronzage', 'tanning', 'cabine uv', 'تسمير'],
  },
  {
    id: 'trade_tattoo_piercing',
    category: 'appointment_service',
    name: { fr: 'Studio Tatouage & Piercing', ar: 'استوديو وشم وبيرسينغ', en: 'Tattoo & Piercing Parlor' },
    badge: { fr: 'Art Corporel', ar: 'وشم', en: 'Tattoo' },
    keywords: ['tatouage', 'tattoo', 'piercing', 'وشم'],
  },
  {
    id: 'trade_massage_therapy',
    category: 'appointment_service',
    name: { fr: 'Massothérapie & Réflexologie', ar: 'تدليك علاجي واسترخاء', en: 'Massage Therapy Clinic' },
    badge: { fr: 'Massages', ar: 'تدليك', en: 'Therapy' },
    keywords: ['massage', 'massotherapeute', 'reflexologie', 'تدليك'],
  },
  {
    id: 'trade_advanced_aesthetics',
    category: 'appointment_service',
    name: { fr: 'Centre d’Esthétique Avancée', ar: 'مركز تجميل متخصص وليزر', en: 'Advanced Aesthetics & Laser' },
    badge: { fr: 'Esthétique Pro', ar: 'ليزر تجميلي', en: 'Aesthetics' },
    keywords: ['esthetique medicale', 'laser', 'epilation', 'ليزر', 'عناية متخصصة'],
  },

  // 3. POS & Retail Inventory
  {
    id: 'trade_traditional_restaurant',
    category: 'pos_inventory',
    name: { fr: 'Restaurant Traditionnel & Gastro', ar: 'مطعم تقليدي وعصري', en: 'Traditional Restaurant' },
    badge: { fr: 'Tables & Salle', ar: 'مطعم', en: 'Dining' },
    keywords: ['restaurant', 'resto', 'gastronomie', 'table', 'مطعم', 'مأكولات'],
  },
  {
    id: 'trade_pizzeria',
    category: 'pos_inventory',
    name: { fr: 'Pizzeria au feu de bois', ar: 'مطعم بيتزا إيطالية', en: 'Woodfire Pizzeria' },
    badge: { fr: 'Pizzas & Four', ar: 'بيتزا', en: 'Pizza' },
    keywords: ['pizzeria', 'pizza', 'four', 'بيتزا'],
  },
  {
    id: 'trade_cafe_bistro',
    category: 'pos_inventory',
    name: { fr: 'Café & Salon de thé', ar: 'مقهى وقاعة شاي', en: 'Specialty Café & Tea Lounge' },
    badge: { fr: 'Comptoir Café', ar: 'مقهى', en: 'Café' },
    keywords: ['cafe', 'coffee', 'salon de the', 'bistro', 'مقهى', 'شاي'],
  },
  {
    id: 'trade_bakery_pastry',
    category: 'pos_inventory',
    name: { fr: 'Pâtisserie & Boulangerie', ar: 'مخبزة وحلويات تقليدية وعصرية', en: 'Bakery & Fine Pastry' },
    badge: { fr: 'Fournil & Vitrine', ar: 'حلويات', en: 'Bakery' },
    keywords: ['boulangerie', 'patisserie', 'croissant', 'gateaux', 'مخبزة', 'حلويات', 'باتيسري'],
  },
  {
    id: 'trade_fast_food',
    category: 'pos_inventory',
    name: { fr: 'Fast-Food & Burger Bar', ar: 'وجبات سريعة وساندويتش', en: 'Fast-Food & Burger Joint' },
    badge: { fr: 'Fast Caisse', ar: 'وجبات سريعة', en: 'Fast Food' },
    keywords: ['fast food', 'burger', 'sandwich', 'snack', 'ساندويتش', 'فاست فود'],
  },
  {
    id: 'trade_superette_grocery',
    category: 'pos_inventory',
    name: { fr: 'Supérette & Épicerie fine', ar: 'سوبر ماركت وبقالة', en: 'Supermarket & Fine Grocery' },
    badge: { fr: 'Rayonnage & Codes', ar: 'سوبرماركت', en: 'Grocery' },
    keywords: ['superette', 'epicerie', 'alimentation', 'supermarche', 'سوبرماركت', 'بقالة'],
  },
  {
    id: 'trade_clothing_boutique',
    category: 'pos_inventory',
    name: { fr: 'Boutique de Prêt-à-Porter', ar: 'محل ملابس جاهزة وأزياء', en: 'Fashion Apparel Boutique' },
    badge: { fr: 'Tailles & Couleurs', ar: 'أزياء وملابس', en: 'Fashion' },
    keywords: ['boutique', 'vetements', 'pret a porter', 'mode', 'ملابس', 'أزياء'],
  },
  {
    id: 'trade_shoes_leather',
    category: 'pos_inventory',
    name: { fr: 'Magasin de Chaussures & Cuir', ar: 'محل أحذية وحقائب جلدية', en: 'Shoes & Leather Goods' },
    badge: { fr: 'Pointures', ar: 'أحذية', en: 'Footwear' },
    keywords: ['chaussures', 'maroquinerie', 'cuir', 'sac', 'أحذية', 'حقائب'],
  },
  {
    id: 'trade_perfumery_cosmetics',
    category: 'pos_inventory',
    name: { fr: 'Parfumerie & Cosmétiques', ar: 'محل عطور ومستحضرات تجميل', en: 'Perfumery & Beauty Shop' },
    badge: { fr: 'Cosmétiques', ar: 'عطور', en: 'Cosmetics' },
    keywords: ['parfumerie', 'cosmetiques', 'maquillage', 'عطور', 'مكياج'],
  },
  {
    id: 'trade_optical_store',
    category: 'pos_inventory',
    name: { fr: 'Magasin d’Optique & Lunetterie', ar: 'محل نظارات وبصريات', en: 'Optical & Eyewear Store' },
    badge: { fr: 'Montures & Verres', ar: 'بصريات', en: 'Optics' },
    keywords: ['optique', 'opticien', 'lunettes', 'نظارات', 'بصريات'],
  },

  // 4. Projects & Milestones (Agency)
  {
    id: 'trade_comm_agency',
    category: 'project_milestone',
    name: { fr: 'Agence de Communication Globale', ar: 'وكالة إشهار واتصال متكاملة', en: '360° Creative Agency' },
    badge: { fr: 'Campagnes & BAT', ar: 'حملات إشهار', en: 'Campaigns' },
    keywords: ['agence de comm', 'communication', 'publicite', 'boite de comm', 'وكالة إشهار', 'إعلان'],
  },
  {
    id: 'trade_digital_marketing',
    category: 'project_milestone',
    name: { fr: 'Agence de Marketing Digital', ar: 'وكالة تسويق رقمي وإعلانات', en: 'Digital Marketing Firm' },
    badge: { fr: 'Médias & Ads', ar: 'تسويق رقمي', en: 'Digital' },
    keywords: ['marketing', 'digital agency', 'social media', 'ads', 'تسويق رقمي', 'سوشيال ميديا'],
  },
  {
    id: 'trade_graphic_studio',
    category: 'project_milestone',
    name: { fr: 'Studio de Création Graphique', ar: 'استوديو تصميم وهوية بصرية', en: 'Graphic & Brand Studio' },
    badge: { fr: 'Design & Livrables', ar: 'تصميم جرافيك', en: 'Branding' },
    keywords: ['design studio', 'graphisme', 'identite visuelle', 'logo', 'تصميم', 'جرافيك'],
  },
  {
    id: 'trade_av_production',
    category: 'project_milestone',
    name: { fr: 'Maison de Production Audiovisuelle', ar: 'شركة إنتاج سمعي بصري وسينمائي', en: 'Audiovisual Production House' },
    badge: { fr: 'Tournage & Régie', ar: 'إنتاج مرئي', en: 'Production' },
    keywords: ['audiovisuel', 'production video', 'tournage', 'spot tv', 'إنتاج فيديو', 'تصوير'],
  },
  {
    id: 'trade_event_agency',
    category: 'project_milestone',
    name: { fr: 'Agence Événementielle & Foires', ar: 'وكالة تنظيم فعاليات ومعارض', en: 'Event Planning Agency' },
    badge: { fr: 'Salons & Stands', ar: 'فعاليات', en: 'Events' },
    keywords: ['evenementiel', 'foire', 'salon', 'stand', 'تنظيم معارض', 'فعاليات'],
  },
  {
    id: 'trade_street_marketing',
    category: 'project_milestone',
    name: { fr: 'Activation Terrain & Street Marketing', ar: 'تسويق ميداني وتنشيط مبيعات', en: 'Field Activation & Promoters' },
    badge: { fr: 'Terrain & Hôtesses', ar: 'تنشيط ميداني', en: 'Field Promo' },
    keywords: ['street marketing', 'activation terrain', 'hotesses', 'hotes', 'تنشيط ميداني', 'أنيماتور'],
  },
  {
    id: 'trade_public_relations',
    category: 'project_milestone',
    name: { fr: 'Agence de Relations Presse (RP)', ar: 'وكالة علاقات عامة وإعلام', en: 'Public Relations Agency' },
    badge: { fr: 'Presse & Médias', ar: 'علاقات عامة', en: 'PR' },
    keywords: ['relations presse', 'rp', 'communique', 'علاقات عامة'],
  },
  {
    id: 'trade_software_agency',
    category: 'project_milestone',
    name: { fr: 'Société de Services IT & Dev Web', ar: 'شركة برمجيات وخدمات معلوماتية', en: 'IT Services & Software House' },
    badge: { fr: 'Sprints & Code', ar: 'تطوير برمجيات', en: 'Software' },
    keywords: ['it services', 'developpement', 'software house', 'app web', 'برمجيات', 'تقنية'],
  },
  {
    id: 'trade_motion_3d',
    category: 'project_milestone',
    name: { fr: 'Studio Motion Design & 3D', ar: 'استوديو موشن جرافيك وأنيميشن', en: 'Motion Design & 3D Lab' },
    badge: { fr: 'Animation 3D', ar: 'موشن جرافيك', en: 'Motion 3D' },
    keywords: ['motion design', '3d', 'animation', 'vfx', 'موشن جرافيك', 'أنيميشن'],
  },
  {
    id: 'trade_brand_consulting',
    category: 'project_milestone',
    name: { fr: 'Cabinet Conseil en Stratégie de Marque', ar: 'مكتب استشارات العلامات التجارية', en: 'Brand Strategy Consultancy' },
    badge: { fr: 'Stratégie', ar: 'استشارات', en: 'Strategy' },
    keywords: ['branding', 'strategie', 'conseil', 'rebranding', 'استشارات هوية'],
  },

  // 5. Rental & Venue Spaces
  {
    id: 'trade_wedding_hall',
    category: 'rental_booking',
    name: { fr: 'Salle des Fêtes & Mariage', ar: 'قاعة حفلات وأعراس', en: 'Wedding & Event Banquet Hall' },
    badge: { fr: 'Cautions & Soirées', ar: 'قاعة أعراس', en: 'Banquet' },
    keywords: ['salle des fetes', 'salle de fete', 'mariage', 'evenement', 'قاعة حفلات', 'أعراس'],
  },
  {
    id: 'trade_coworking_space',
    category: 'rental_booking',
    name: { fr: 'Espace de Coworking & Bureaux', ar: 'مساحة عمل مشتركة ومكاتب', en: 'Coworking Hub & Shared Desks' },
    badge: { fr: 'Postes & Bureaux', ar: 'مساحة مشتركة', en: 'Coworking' },
    keywords: ['coworking', 'bureau partage', 'openspace', 'مساحة عمل مشتركة', 'مكاتب'],
  },
  {
    id: 'trade_conference_hall',
    category: 'rental_booking',
    name: { fr: 'Salle de Conférence & Séminaires', ar: 'قاعة مؤتمرات وندوات', en: 'Conference & Seminar Hall' },
    badge: { fr: 'Auditorium', ar: 'مؤتمرات', en: 'Conference' },
    keywords: ['conference', 'seminaire', 'reunion', 'amphi', 'مؤتمرات', 'ندوات'],
  },
  {
    id: 'trade_photo_studio',
    category: 'rental_booking',
    name: { fr: 'Studio Photo Professionnel', ar: 'استوديو تصوير فوتوغرافي محترف', en: 'Professional Photo Studio' },
    badge: { fr: 'Plateau & Flashs', ar: 'تصوير', en: 'Photo Studio' },
    keywords: ['studio photo', 'photographie', 'cyclorama', 'استوديو تصوير'],
  },
  {
    id: 'trade_sound_studio',
    category: 'rental_booking',
    name: { fr: 'Studio d’Enregistrement Musical', ar: 'استوديو تسجيل صوتي وموسيقى', en: 'Sound Recording Studio' },
    badge: { fr: 'Cabine & Micros', ar: 'تسجيل صوتي', en: 'Audio Studio' },
    keywords: ['studio son', 'enregistrement', 'cabine voix', 'استوديو صوت'],
  },
  {
    id: 'trade_car_rental',
    category: 'rental_booking',
    name: { fr: 'Agence de Location de Véhicules', ar: 'وكالة كراء وتأجير سيارات', en: 'Car Rental Agency' },
    badge: { fr: 'Flotte & Cautions', ar: 'كراء سيارات', en: 'Car Rental' },
    keywords: ['location voiture', 'rent a car', 'flotte auto', 'كراء سيارات', 'تأجير سيارات'],
  },
  {
    id: 'trade_av_equipment_rental',
    category: 'rental_booking',
    name: { fr: 'Location Matériel Audiovisuel & Sono', ar: 'كراء معدات صوتية وإضاءة', en: 'AV & Sound Gear Rental' },
    badge: { fr: 'Parc Matériel', ar: 'معدات صوت', en: 'Gear Rental' },
    keywords: ['location sono', 'materiel video', 'camera rental', 'كراء معدات صوت'],
  },
  {
    id: 'trade_popup_store',
    category: 'rental_booking',
    name: { fr: 'Espace Pop-up & Galerie Éphémère', ar: 'مساحة تجارية مؤقتة ومعارض', en: 'Pop-Up Store & Gallery' },
    badge: { fr: 'Éphémère', ar: 'فضاء مؤقت', en: 'Pop-up' },
    keywords: ['popup store', 'galerie', 'espace commercial', 'فضاء مؤقت'],
  },
  {
    id: 'trade_training_rooms',
    category: 'rental_booking',
    name: { fr: 'Location Salles de Formation', ar: 'تأجير قاعات تدريب مجهزة', en: 'Equipped Training Room Rental' },
    badge: { fr: 'Salles Équipées', ar: 'قاعات تدريب', en: 'Training Room' },
    keywords: ['location salle', 'salle formation', 'videoprojecteur', 'تأجير قاعات'],
  },
  {
    id: 'trade_event_furniture',
    category: 'rental_booking',
    name: { fr: 'Location Mobilier Événementiel', ar: 'كراء أثاث وديكور الحفلات', en: 'Event Furniture & Decor Rental' },
    badge: { fr: 'Tables & Tentes', ar: 'أثاث حفلات', en: 'Party Rentals' },
    keywords: ['location chaises', 'tentes', 'chapiteau', 'كراء طاولات وكراسي'],
  },

  // 6. Education, Academy & Cohorts
  {
    id: 'trade_private_school',
    category: 'education_cohort',
    name: { fr: 'École Privée Primaire & Collège', ar: 'مدرسة خاصة ابتدائية ومتوسطة', en: 'Private K-12 Academy' },
    badge: { fr: 'Élèves & Niveaux', ar: 'مدرسة خاصة', en: 'School' },
    keywords: ['ecole privee', 'primaire', 'college', 'eleves', 'مدرسة خاصة', 'تلاميذ'],
  },
  {
    id: 'trade_language_academy',
    category: 'education_cohort',
    name: { fr: 'Académie de Langues Étrangères', ar: 'معهد تعليم اللغات الحية', en: 'Language Learning Academy' },
    badge: { fr: 'Sessions & Niveaux', ar: 'تعليم لغات', en: 'Languages' },
    keywords: ['langues', 'anglais', 'francais', 'allemand', 'لغات', 'تعليم لغات'],
  },
  {
    id: 'trade_vocational_center',
    category: 'education_cohort',
    name: { fr: 'Centre de Formation Professionnelle', ar: 'مركز تكوين مهني معتمد', en: 'Vocational Training Institute' },
    badge: { fr: 'Diplômes & Certifs', ar: 'تكوين مهني', en: 'Vocational' },
    keywords: ['formation pro', 'certificat', 'metiers', 'تكوين مهني', 'شهادة'],
  },
  {
    id: 'trade_coding_school',
    category: 'education_cohort',
    name: { fr: 'École de Code & Informatique', ar: 'مدرسة برمجة ومعلوماتية', en: 'Coding & Tech Bootcamp' },
    badge: { fr: 'Promotions Dev', ar: 'برمجة', en: 'Tech Academy' },
    keywords: ['coding bootcamp', 'developpement', 'ecole code', 'مدرسة برمجة', 'كود'],
  },
  {
    id: 'trade_tutoring_center',
    category: 'education_cohort',
    name: { fr: 'Centre de Soutien Scolaire', ar: 'مركز دروس دعم وتقوية', en: 'Tutoring & After-School Center' },
    badge: { fr: 'Groupes BEM/BAC', ar: 'دروس دعم', en: 'Tutoring' },
    keywords: ['cours particuliers', 'soutien scolaire', 'bac', 'bem', 'دروس دعم', 'تقوية'],
  },
  {
    id: 'trade_driving_school',
    category: 'education_cohort',
    name: { fr: 'Auto-École Agréée', ar: 'مدرسة تعليم سياقة معتمدة', en: 'Certified Driving School' },
    badge: { fr: 'Code & Conduite', ar: 'تعليم سياقة', en: 'Driving' },
    keywords: ['auto ecole', 'permis de conduire', 'code de la route', 'تعليم سياقة', 'رخصة'],
  },
  {
    id: 'trade_music_academy',
    category: 'education_cohort',
    name: { fr: 'École de Musique & Conservatoire', ar: 'معهد موسيقى وعزف', en: 'Music School & Conservatory' },
    badge: { fr: 'Instruments', ar: 'موسيقى', en: 'Music' },
    keywords: ['musique', 'piano', 'guitare', 'solfege', 'موسيقى', 'بيانو'],
  },
  {
    id: 'trade_art_school',
    category: 'education_cohort',
    name: { fr: 'École d’Art & Dessin', ar: 'مدرسة رسم وفنون جميلة', en: 'Fine Arts & Drawing Studio' },
    badge: { fr: 'Ateliers Dessin', ar: 'فنون ورسم', en: 'Fine Arts' },
    keywords: ['dessin', 'peinture', 'art plastique', 'رسم', 'فنون جميلة'],
  },
  {
    id: 'trade_kids_robotics',
    category: 'education_cohort',
    name: { fr: 'Académie de Robotique & STEM', ar: 'أكاديمية روبوتيك وذكاء للأطفال', en: 'Kids STEM & Robotics Lab' },
    badge: { fr: 'Ateliers STEM', ar: 'روبوتيك للأطفال', en: 'Robotics' },
    keywords: ['robotique', 'stem', 'enfants', 'sciences', 'روبوتيك', 'ذكاء'],
  },
  {
    id: 'trade_business_institute',
    category: 'education_cohort',
    name: { fr: 'Institut de Gestion & Management', ar: 'معهد إدارة وتسيير الأعمال', en: 'Business Management Academy' },
    badge: { fr: 'MBA & Masters', ar: 'تسيير أعمال', en: 'Business School' },
    keywords: ['management', 'gestion', 'comptabilite', 'mba', 'تسيير أعمال', 'مناجمنت'],
  },

  // 7. Freelance & Solo Practice
  {
    id: 'trade_solo_dev',
    category: 'freelance_solo',
    name: { fr: 'Développeur Web & Mobile Solo', ar: 'مبرمج مواقع وتطبيقات مستقل', en: 'Solo Full-Stack Developer' },
    badge: { fr: 'Freelance Tech', ar: 'مبرمج مستقل', en: 'Solo Dev' },
    keywords: ['freelance dev', 'developpeur web', 'react', 'mobile', 'مبرمج مستقل', 'مطور'],
  },
  {
    id: 'trade_solo_designer',
    category: 'freelance_solo',
    name: { fr: 'Designer UI/UX & Produit Solo', ar: 'مصمم واجهات مستخدم مستقل', en: 'Solo UI/UX Product Designer' },
    badge: { fr: 'Figma & Écrans', ar: 'مصمم واجهات', en: 'UI/UX' },
    keywords: ['designer freelance', 'ui ux', 'figma', 'product designer', 'مصمم واجهات', 'يو اكس'],
  },
  {
    id: 'trade_solo_editor',
    category: 'freelance_solo',
    name: { fr: 'Monteur Vidéo & Motion Solo', ar: 'مونتير فيديو وموشن جرافيك حر', en: 'Solo Video Editor & Motion' },
    badge: { fr: 'Montage & Rushes', ar: 'مونتاج فيديو', en: 'Editor' },
    keywords: ['monteur video', 'video editor', 'premiere', 'after effects', 'مونتير', 'مونتاج'],
  },
  {
    id: 'trade_solo_copywriter',
    category: 'freelance_solo',
    name: { fr: 'Rédacteur Web & Copywriter Solo', ar: 'كاتب محتوى وإعلانات مستقل', en: 'Solo Copywriter & Content Lead' },
    badge: { fr: 'Contenus & SEO', ar: 'كتابة محتوى', en: 'Copywriting' },
    keywords: ['copywriter', 'redacteur web', 'redaction', 'articles', 'كاتب محتوى', 'كتابة إعلانية'],
  },
  {
    id: 'trade_solo_translator',
    category: 'freelance_solo',
    name: { fr: 'Traducteur Assermenté Indépendant', ar: 'مترجم محلف ومعتمد مستقل', en: 'Certified Freelance Translator' },
    badge: { fr: 'Dossiers & Mots', ar: 'ترجمة محلفة', en: 'Translator' },
    keywords: ['traducteur', 'traduction', 'assermente', 'مترجم', 'ترجمة رسمية'],
  },
  {
    id: 'trade_solo_seo_growth',
    category: 'freelance_solo',
    name: { fr: 'Consultant SEO & Growth Solo', ar: 'خبير سيو وتسويق مستقل', en: 'Solo SEO & Growth Strategist' },
    badge: { fr: 'Trafic & Rangs', ar: 'سيو وتسويق', en: 'SEO Specialist' },
    keywords: ['seo', 'growth hacker', 'referencement', 'سيو', 'تسويق الكتروني'],
  },
  {
    id: 'trade_solo_photographer',
    category: 'freelance_solo',
    name: { fr: 'Photographe & Vidéaste Solo', ar: 'مصور فوتوغرافي وفيديو حر', en: 'Solo Event & Brand Photographer' },
    badge: { fr: 'Shootings', ar: 'تصوير احترافي', en: 'Photo Solo' },
    keywords: ['photographe freelance', 'shooting', 'mariage photo', 'مصور فوتوغرافي'],
  },
  {
    id: 'trade_solo_cm',
    category: 'freelance_solo',
    name: { fr: 'Community Manager Freelance', ar: 'مسير صفحات ومنصات تواصل حر', en: 'Solo Social Media Manager' },
    badge: { fr: 'Réseaux Sociaux', ar: 'إدارة صفحات', en: 'Social Media' },
    keywords: ['community manager', 'reseaux sociaux', 'social media', 'إدارة صفحات'],
  },
  {
    id: 'trade_solo_illustrator',
    category: 'freelance_solo',
    name: { fr: 'Illustrateur & Artiste Digital', ar: 'رسام وفنان رقمي مستقل', en: 'Digital Illustrator & 2D Artist' },
    badge: { fr: 'Planches & Art', ar: 'رسم رقمي', en: 'Illustrator' },
    keywords: ['illustrateur', 'digital art', 'dessinateur', 'رسام رقمي'],
  },
  {
    id: 'trade_solo_data_analyst',
    category: 'freelance_solo',
    name: { fr: 'Consultant Data & Analytics Solo', ar: 'محلل بيانات وإحصائيات مستقل', en: 'Solo Data & Analytics Analyst' },
    badge: { fr: 'Dashboards Data', ar: 'تحليل بيانات', en: 'Data Analyst' },
    keywords: ['data analyst', 'power bi', 'sql', 'excel pro', 'محلل بيانات'],
  },

  // 8. B2B Commercial Trading & Wholesale
  {
    id: 'trade_wholesale_food',
    category: 'trading_commercial',
    name: { fr: 'Grossiste Produits Agroalimentaires', ar: 'تجارة الجملة للمواد الغذائية العامة', en: 'Wholesale Food & Groceries' },
    badge: { fr: 'Bons de Gros', ar: 'تجارة جملة مواد غذائية', en: 'Food Wholesale' },
    keywords: ['grossiste alimentaire', 'agroalimentaire', 'commerce de gros', 'تجارة الجملة', 'مواد غذائية'],
  },
  {
    id: 'trade_wholesale_building_mat',
    category: 'trading_commercial',
    name: { fr: 'Négoce de Matériaux de Construction', ar: 'تجارة مواد البناء والخرسانة بالجملة', en: 'Building Materials Trading' },
    badge: { fr: 'Ciment & Fer', ar: 'مواد بناء بالجملة', en: 'Building Supply' },
    keywords: ['materiaux de construction', 'ciment', 'fer a beton', 'grossiste btp', 'مواد بناء بالجملة', 'حديد وإسمنت'],
  },
  {
    id: 'trade_wholesale_hardware',
    category: 'trading_commercial',
    name: { fr: 'Quincaillerie Industrielle en Gros', ar: 'خردوات صناعية ولوازم مهنية بالجملة', en: 'Industrial Hardware Wholesale' },
    badge: { fr: 'Outillage Gros', ar: 'خردوات صناعية', en: 'Hardware Supply' },
    keywords: ['quincaillerie', 'outillage', 'visserie', 'grossiste quincaillerie', 'خردوات بالجملة'],
  },
  {
    id: 'trade_wholesale_auto_parts',
    category: 'trading_commercial',
    name: { fr: 'Distributeur Pièces Détachées Auto', ar: 'توزيع قطع غيار السيارات بالجملة', en: 'Auto Spare Parts Distributor' },
    badge: { fr: 'Pièces Auto', ar: 'قطع غيار بالجملة', en: 'Auto Parts' },
    keywords: ['pieces auto', 'pieces detachees', 'filtres', 'freins', 'قطع غيار جملة'],
  },
  {
    id: 'trade_wholesale_electrical',
    category: 'trading_commercial',
    name: { fr: 'Grossiste Matériel Électrique & Éclairage', ar: 'تجارة التجهيزات الكهربائية والإنارة بالجملة', en: 'Electrical Supplies Wholesaler' },
    badge: { fr: 'Câbles & Lampes', ar: 'كهرباء بالجملة', en: 'Electrical Supply' },
    keywords: ['materiel electrique', 'cables', 'eclairage', 'grossiste electrique', 'تجهيزات كهربائية بالجملة'],
  },
  {
    id: 'trade_import_export',
    category: 'trading_commercial',
    name: { fr: 'Société d’Import-Export & Négoce B2B', ar: 'شركة استيراد وتصدير وتجارة دولية', en: 'Import-Export & Global Trading' },
    badge: { fr: 'Douanes & Conteneurs', ar: 'استيراد وتصدير', en: 'Import / Export' },
    keywords: ['import export', 'commerce international', 'conteneur', 'douane', 'استيراد وتصدير', 'تجارة دولية'],
  },
  {
    id: 'trade_wholesale_packaging',
    category: 'trading_commercial',
    name: { fr: 'Fournisseur d’Emballage & Carton', ar: 'توزيع مواد التغليف والكرتون بالجملة', en: 'Packaging & Box Supplies' },
    badge: { fr: 'Cartons & Palettes', ar: 'تغليف وكرتون', en: 'Packaging' },
    keywords: ['emballage', 'carton', 'plastique', 'packaging', 'تغليف', 'كرتون'],
  },
  {
    id: 'trade_wholesale_cosmetics',
    category: 'trading_commercial',
    name: { fr: 'Grossiste en Cosmétiques & Droguerie', ar: 'تجارة مستحضرات التجميل ومواد التنظيف بالجملة', en: 'Cosmetics & Drugstore Wholesale' },
    badge: { fr: 'Droguerie Gros', ar: 'مواد تنظيف وتجميل', en: 'Drugstore Supply' },
    keywords: ['droguerie', 'cosmetiques gros', 'lessive', 'مستحضرات تجميل بالجملة', 'مواد تنظيف'],
  },
  {
    id: 'trade_wholesale_wood_metals',
    category: 'trading_commercial',
    name: { fr: 'Négoce Bois, Profilés Aluminium & Inox', ar: 'تجارة الخشب والحديد والألمنيوم بالجملة', en: 'Timber, Aluminum & Steel Trading' },
    badge: { fr: 'Poutres & Barres', ar: 'خشب وألمنيوم', en: 'Metals & Timber' },
    keywords: ['bois', 'aluminium', 'profilés', 'inox', 'خشب', 'ألمنيوم جملة'],
  },
  {
    id: 'trade_beverage_depot',
    category: 'trading_commercial',
    name: { fr: 'Dépôt de Distribution de Boissons', ar: 'مستودع توزيع المشروبات والمياه المعدنية', en: 'Beverages Distribution Depot' },
    badge: { fr: 'Packs & Casiers', ar: 'مشروبات ومياه', en: 'Beverage Depot' },
    keywords: ['boissons', 'eau minerale', 'jus', 'depot boisson', 'مشروبات', 'مياه معدنية بالجملة'],
  },

  // 9. Medical Clinic & Health Practice
  {
    id: 'trade_general_practitioner',
    category: 'medical_clinic',
    name: { fr: 'Cabinet Médical Généraliste', ar: 'عيادة طب عام وفحوصات', en: 'General Medical Practice' },
    badge: { fr: 'Consultations', ar: 'طب عام', en: 'General Doctor' },
    keywords: ['cabinet medical', 'medecin', 'generaliste', 'consultation', 'طبيب عام', 'عيادة طبية'],
  },
  {
    id: 'trade_dental_clinic',
    category: 'medical_clinic',
    name: { fr: 'Cabinet Dentaire & Implantologie', ar: 'عيادة طب وجراحة الأسنان', en: 'Dental & Implantology Clinic' },
    badge: { fr: 'Fauteuils Soins', ar: 'طب أسنان', en: 'Dental Clinic' },
    keywords: ['dentiste', 'cabinet dentaire', 'dents', 'implant', 'طبيب أسنان', 'عيادة أسنان', 'جراحة أسنان'],
  },
  {
    id: 'trade_pediatric_clinic',
    category: 'medical_clinic',
    name: { fr: 'Cabinet de Pédiatrie', ar: 'عيادة متخصصة في طب الأطفال', en: 'Pediatric Medical Practice' },
    badge: { fr: 'Vaccins & Enfants', ar: 'طب أطفال', en: 'Pediatrics' },
    keywords: ['pediatre', 'enfants', 'bebe', 'vaccin', 'طبيب أطفال', 'طب أطفال'],
  },
  {
    id: 'trade_physiotherapy',
    category: 'medical_clinic',
    name: { fr: 'Centre de Kinésithérapie & Rééducation', ar: 'مركز علاج فيزيائي وترويض طبي', en: 'Physical Therapy & Rehab' },
    badge: { fr: 'Séances Rééduc', ar: 'علاج طبيعي', en: 'Physiotherapy' },
    keywords: ['kinesitherapeute', 'kine', 'reeducation', 'physio', 'علاج طبيعي', 'ترويض طبي'],
  },
  {
    id: 'trade_ophthalmology',
    category: 'medical_clinic',
    name: { fr: 'Cabinet d’Ophtalmologie', ar: 'عيادة طب وجراحة العيون', en: 'Ophthalmology Clinic' },
    badge: { fr: 'Vue & Réfraction', ar: 'طب عيون', en: 'Eye Clinic' },
    keywords: ['ophtalmologue', 'yeux', 'vision', 'lunettes ophtalmo', 'طبيب عيون', 'طب العيون'],
  },
  {
    id: 'trade_cardiology',
    category: 'medical_clinic',
    name: { fr: 'Cabinet de Cardiologie', ar: 'عيادة أمراض القلب والأوعية', en: 'Cardiology Medical Practice' },
    badge: { fr: 'ECG & Écho', ar: 'أمراض قلب', en: 'Cardiology' },
    keywords: ['cardiologue', 'coeur', 'ecg', 'tension', 'طبيب قلب', 'أمراض القلب'],
  },
  {
    id: 'trade_radiology_center',
    category: 'medical_clinic',
    name: { fr: 'Centre d’Échographie & Radiologie', ar: 'مركز أشعة وتصوير طبي', en: 'Ultrasound & Radiology Lab' },
    badge: { fr: 'Clichés & Scans', ar: 'أشعة وتصوير', en: 'Radiology' },
    keywords: ['radiologie', 'echographie', 'irm', 'scanner', 'أشعة', 'تصوير طبي'],
  },
  {
    id: 'trade_dermatology',
    category: 'medical_clinic',
    name: { fr: 'Cabinet de Dermatologie', ar: 'عيادة أمراض جلدية وتجميل طبي', en: 'Dermatology Medical Office' },
    badge: { fr: 'Peau & Laser', ar: 'أمراض جلدية', en: 'Dermatology' },
    keywords: ['dermatologue', 'peau', 'dermatologie', 'طبيب جلد', 'أمراض جلدية'],
  },
  {
    id: 'trade_gynecology',
    category: 'medical_clinic',
    name: { fr: 'Cabinet de Gynécologie & Obstétrique', ar: 'عيادة طب النساء والتوليد', en: 'Obstetrics & Gynecology Clinic' },
    badge: { fr: 'Suivi Grossesse', ar: 'طب نساء وتوليد', en: 'Gynecology' },
    keywords: ['gynecologue', 'grossesse', 'maternite', 'طبيبة نساء', 'توليد'],
  },
  {
    id: 'trade_speech_therapy',
    category: 'medical_clinic',
    name: { fr: 'Cabinet d’Orthophonie & Psychologie', ar: 'عيادة نطق وتخاطب وعلاج نفسي', en: 'Speech Therapy & Psychology' },
    badge: { fr: 'Bilans & Voix', ar: 'تخاطب ونطق', en: 'Speech Therapy' },
    keywords: ['orthophoniste', 'psychologue', 'langage', 'autisme', 'أخصائي نطق', 'تخاطب'],
  },

  // 10. Automotive Garage & Repair
  {
    id: 'trade_mechanical_garage',
    category: 'auto_garage',
    name: { fr: 'Garage de Mécanique Générale', ar: 'ورشة صيانة وميكانيك عامة للسيارات', en: 'General Mechanical Garage' },
    badge: { fr: 'Ordres de Rép.', ar: 'ميكانيك عام', en: 'Mechanic' },
    keywords: ['garage', 'mecanique', 'reparation auto', 'moteur', 'ميكانيكي', 'تصليح سيارات'],
  },
  {
    id: 'trade_body_paint_shop',
    category: 'auto_garage',
    name: { fr: 'Atelier de Tôlerie & Peinture Auto', ar: 'ورشة سمكرة ودهان سيارات', en: 'Auto Body & Paint Workshop' },
    badge: { fr: 'Carrosserie', ar: 'سمكرة ودهان', en: 'Body & Paint' },
    keywords: ['tolerie', 'carrosserie', 'peinture auto', 'سمكرة', 'دهان سيارات'],
  },
  {
    id: 'trade_electronic_diagnostic',
    category: 'auto_garage',
    name: { fr: 'Centre de Diagnostic Électronique Scanner', ar: 'مركز فحص وتشخيص إلكتروني بسكانر', en: 'Electronic Diagnostics & Scanner' },
    badge: { fr: 'Scan OBD & Boîtiers', ar: 'فحص إلكتروني', en: 'Diagnostics' },
    keywords: ['diagnostic auto', 'scanner auto', 'obd', 'reprogrammation', 'سكانر سيارات', 'فحص إلكتروني'],
  },
  {
    id: 'trade_oil_tire_center',
    category: 'auto_garage',
    name: { fr: 'Station de Vidange & Pneumatique', ar: 'مركز تغيير زيت وإطارات', en: 'Oil Change & Tire Center' },
    badge: { fr: 'Vidange & Pneus', ar: 'تغيير زيت وعجلات', en: 'Tire & Lube' },
    keywords: ['vidange', 'pneus', 'filtration', 'lubrifiants', 'تغيير زيت', 'عجلات وإطارات'],
  },
  {
    id: 'trade_auto_electrical_ac',
    category: 'auto_garage',
    name: { fr: 'Atelier Électricité & Climatisation Auto', ar: 'ورشة كهرباء وتكييف سيارات', en: 'Auto Electrical & AC Service' },
    badge: { fr: 'Gaz Clim & Faisceaux', ar: 'كهرباء وتكييف', en: 'Auto Electric' },
    keywords: ['electricien auto', 'climatisation', 'gaz r134a', 'demarreur', 'كهرباء سيارات', 'تكييف سيارات'],
  },
  {
    id: 'trade_vehicle_inspection',
    category: 'auto_garage',
    name: { fr: 'Centre de Contrôle Technique Agréé', ar: 'مركز مراقبة تقنية دورية للسيارات', en: 'Vehicle Inspection Center' },
    badge: { fr: 'Visites Réglement.', ar: 'مراقبة تقنية', en: 'Inspection' },
    keywords: ['controle technique', 'visite technique', 'securite routiere', 'مراقبة تقنية'],
  },
  {
    id: 'trade_wheel_alignment',
    category: 'auto_garage',
    name: { fr: 'Atelier Géométrie & Suspension', ar: 'موازنة عجلات ونظام تعليق', en: 'Wheel Alignment & Suspension' },
    badge: { fr: 'Parallélisme', ar: 'موازنة عجلات', en: 'Alignment' },
    keywords: ['parallelisme', 'geometrie', 'amortisseurs', 'موازنة عجلات'],
  },
  {
    id: 'trade_engine_machining',
    category: 'auto_garage',
    name: { fr: 'Atelier d’Usinage Culasses & Moteurs', ar: 'مخرطة وميكانيك دقيقة لمحركات السيارات', en: 'Engine Machining & Head Rebuild' },
    badge: { fr: 'Tournage & Rectif.', ar: 'خراطة محركات', en: 'Machining' },
    keywords: ['rectification', 'culasse', 'tournage moteur', 'مخرطة سيارات'],
  },
  {
    id: 'trade_auto_detailing',
    category: 'auto_garage',
    name: { fr: 'Centre de Detailing & Protection Céramique', ar: 'مركز غسيل وتلميع وحماية سيراميك', en: 'Auto Detailing & Ceramic Coat' },
    badge: { fr: 'Lavage & Polish', ar: 'تلميع وحماية', en: 'Detailing' },
    keywords: ['detailing', 'lavage auto', 'ceramique', 'polish', 'غسيل وتلميع', 'ديتايلينغ'],
  },
  {
    id: 'trade_moto_repair',
    category: 'auto_garage',
    name: { fr: 'Garage de Réparation Motos & Scooters', ar: 'ورشة صيانة دراجات نارية وسكوتر', en: 'Motorcycle & Scooter Repair' },
    badge: { fr: 'Deux-Roues', ar: 'دراجات نارية', en: 'Moto Repair' },
    keywords: ['moto', 'scooter', 'reparation moto', 'صيانة دراجات'],
  },

  // 11. Real Estate & Property
  {
    id: 'trade_real_estate_agency',
    category: 'real_estate',
    name: { fr: 'Agence Immobilière de Transaction', ar: 'وكالة عقارية للبيع والشراء والكراء', en: 'Real Estate Brokerage & Sales' },
    badge: { fr: 'Mandats Vente/Loc', ar: 'وكالة عقارية', en: 'Real Estate' },
    keywords: ['agence immobiliere', 'immobilier', 'vente appartement', 'location villa', 'وكالة عقارية', 'عقارات'],
  },
  {
    id: 'trade_property_developer',
    category: 'real_estate',
    name: { fr: 'Promoteur Immobilier Résidentiel', ar: 'مؤسسة ترقية عقارية وبناء سكني', en: 'Residential Property Developer' },
    badge: { fr: 'Résidences & Lots', ar: 'ترقية عقارية', en: 'Development' },
    keywords: ['promoteur immobilier', 'promotion immobiliere', 'logements', 'ترقية عقارية', 'سكنات'],
  },
  {
    id: 'trade_rental_management',
    category: 'real_estate',
    name: { fr: 'Cabinet de Gestion Locative', ar: 'مكتب تسيير وإيجار العقارات والأملاك', en: 'Rental Property Management' },
    badge: { fr: 'Baux & Loyers', ar: 'تسيير إيجاري', en: 'Rental Mgmt' },
    keywords: ['gestion locative', 'loyers', 'bail', 'quittance', 'تسيير عقارات', 'إيجار'],
  },
  {
    id: 'trade_building_syndic',
    category: 'real_estate',
    name: { fr: 'Syndic de Copropriété Professionnel', ar: 'إدارة وتسيير الملكية المشتركة', en: 'HOA & Building Syndic' },
    badge: { fr: 'Charges & Copro', ar: 'تسيير عمارات', en: 'Syndic' },
    keywords: ['syndic', 'copropriete', 'immeuble', 'charges syndic', 'تسيير عمارات', 'ملكية مشتركة'],
  },
  {
    id: 'trade_property_valuation',
    category: 'real_estate',
    name: { fr: 'Cabinet d’Expertise Foncière & Évaluation', ar: 'مكتب خبير عقاري ومعاينة أملاك', en: 'Real Estate Valuation & Appraisal' },
    badge: { fr: 'Expertise Prix', ar: 'خبير عقاري', en: 'Appraisal' },
    keywords: ['expert immobilier', 'expertise fonciere', 'evaluation', 'خبير عقاري', 'تقييم عقاري'],
  },
  {
    id: 'trade_commercial_real_estate',
    category: 'real_estate',
    name: { fr: 'Immobilier Commercial & Bureaux', ar: 'عقارات تجارية ومكاتب شركات', en: 'Commercial Real Estate Broker' },
    badge: { fr: 'Bureaux & Hangars', ar: 'عقارات تجارية', en: 'Commercial RE' },
    keywords: ['immobilier commercial', 'hangar', 'bureau a louer', 'مكاتب للإيجار', 'محلات تجارية'],
  },
  {
    id: 'trade_student_housing',
    category: 'real_estate',
    name: { fr: 'Gestion de Résidences Étudiantes & Colocation', ar: 'إدارة إقامات طلابية وسكن مشترك', en: 'Student Housing & Coliving' },
    badge: { fr: 'Chambres & Studios', ar: 'سكن طلاب', en: 'Coliving' },
    keywords: ['colocation', 'residence etudiante', 'studio etudiant', 'سكن جامعي', 'سكن مشترك'],
  },
  {
    id: 'trade_asset_management',
    category: 'real_estate',
    name: { fr: 'Cabinet d’Administration de Biens', ar: 'إدارة أصول وأملاك عقارية استثمارية', en: 'Property Asset Management' },
    badge: { fr: 'Patrimoine Immo', ar: 'إدارة أملاك', en: 'Asset Mgmt' },
    keywords: ['administration de biens', 'patrimoine', 'foncier', 'إدارة أملاك'],
  },
  {
    id: 'trade_land_acquisition',
    category: 'real_estate',
    name: { fr: 'Transaction de Terrains & Lots Foncier', ar: 'بيع وشراء الأراضي والعقارات الفلاحية', en: 'Land & Lot Acquisition' },
    badge: { fr: 'Terrains & Actes', ar: 'أراضي وعقارات', en: 'Land Broker' },
    keywords: ['terrain a vendre', 'lotissement', 'foncier', 'أراضي للبيع', 'قطع أراضي'],
  },
  {
    id: 'trade_vacation_rentals',
    category: 'real_estate',
    name: { fr: 'Gestion de Résidences de Vacances', ar: 'إدارة إقامات سياحية وشقق موسمية', en: 'Holiday & Vacation Rentals' },
    badge: { fr: 'Saisonnier', ar: 'إيجار موسمي', en: 'Vacation' },
    keywords: ['location vacances', 'saisonnier', 'bungalow', 'شقق سياحية', 'إيجار فندقي'],
  },

  // 12. Manufacturing & Workshop Production
  {
    id: 'trade_apparel_textile',
    category: 'manufacturing_production',
    name: { fr: 'Atelier de Confection Textile & Vêtements', ar: 'ورشة خياطة وصناعة ألبسة', en: 'Apparel & Textile Workshop' },
    badge: { fr: 'Séries & Coupes', ar: 'خياطة وتصنيع ألبسة', en: 'Textile' },
    keywords: ['confection', 'textile', 'atelier couture', 'vetements', 'ورشة خياطة', 'صناعة ألبسة'],
  },
  {
    id: 'trade_wood_furniture_workshop',
    category: 'manufacturing_production',
    name: { fr: 'Menuiserie Bois & Fabrication de Meubles', ar: 'ورشة نجارة خشب وصناعة أثاث', en: 'Custom Furniture & Woodworking' },
    badge: { fr: 'Nomenclatures Bois', ar: 'نجارة خشب وأثاث', en: 'Woodworking' },
    keywords: ['menuiserie bois', 'meubles', 'ebeniste', 'chambre a coucher', 'نجارة خشب', 'صناعة أثاث'],
  },
  {
    id: 'trade_aluminum_pvc',
    category: 'manufacturing_production',
    name: { fr: 'Atelier Menuiserie Aluminium & PVC', ar: 'ورشة نجارة ألمنيوم وPVC', en: 'Aluminum & PVC Fabrication' },
    badge: { fr: 'Châssis & Profilés', ar: 'ألمنيوم وPVC', en: 'Alu & PVC' },
    keywords: ['menuiserie alu', 'pvc', 'fenetres alu', 'volets', 'نجارة ألمنيوم', 'نوافذ بي في سي'],
  },
  {
    id: 'trade_metalworks_iron',
    category: 'manufacturing_production',
    name: { fr: 'Ferronnerie & Serrurerie Métallique', ar: 'حدادة فنية وهياكل معدنية', en: 'Metalworks & Iron Craft Workshop' },
    badge: { fr: 'Soudure & Découpe', ar: 'حدادة ولحام', en: 'Metalworks' },
    keywords: ['ferronnerie', 'serrurerie', 'soudure', 'grille fer', 'حدادة', 'لحام'],
  },
  {
    id: 'trade_plastic_molding',
    category: 'manufacturing_production',
    name: { fr: 'Unité d’Injection & Plasturgie', ar: 'وحدة تشكيل وحقن البلاستيك', en: 'Plastic Injection & Molding' },
    badge: { fr: 'Moules & Injection', ar: 'تشكيل بلاستيك', en: 'Plastics' },
    keywords: ['plasturgie', 'injection plastique', 'moule', 'تصنيع بلاستيك'],
  },
  {
    id: 'trade_offset_print_press',
    category: 'manufacturing_production',
    name: { fr: 'Imprimerie Industrielle & Packaging', ar: 'مطبعة صناعية وتغليف كرتوني', en: 'Industrial Print Press & Packaging' },
    badge: { fr: 'Offset & Tirages', ar: 'مطبعة وتغليف', en: 'Print Press' },
    keywords: ['imprimerie', 'offset', 'serigraphie', 'packaging carton', 'مطبعة', 'طباعة صناعية'],
  },
  {
    id: 'trade_upholstery_salon',
    category: 'manufacturing_production',
    name: { fr: 'Atelier de Tapisserie & Salons Marocains', ar: 'ورشة تنجيد أثاث وصالونات عصرية', en: 'Upholstery & Sofa Workshop' },
    badge: { fr: 'Mousse & Tissus', ar: 'تنجيد صالونات', en: 'Upholstery' },
    keywords: ['tapisserie', 'salon moderne', 'mousse', 'tissu ameublement', 'تنجيد', 'صالونات'],
  },
  {
    id: 'trade_marble_stone',
    category: 'manufacturing_production',
    name: { fr: 'Marbrerie & Découpe de Pierres Naturelles', ar: 'ورشة رخام وقص حجارة طبيعية وغرانيت', en: 'Marble & Granite Stone Cutting' },
    badge: { fr: 'Dalles & Plaques', ar: 'رخام وغرانيت', en: 'Marble Works' },
    keywords: ['marbrerie', 'marbre', 'granit', 'tailleur de pierre', 'رخام', 'غرانيت'],
  },
  {
    id: 'trade_stainless_steel',
    category: 'manufacturing_production',
    name: { fr: 'Fabrication Équipements Inox & Cuisines Pro', ar: 'تصنيع تجهيزات ستانلس ستيل ومطابخ', en: 'Stainless Steel Commercial Kitchens' },
    badge: { fr: 'Inox Sur-Mesure', ar: 'ستانلس ستيل', en: 'Stainless Steel' },
    keywords: ['equipement inox', 'cuisine pro', 'inox 304', 'ستانلس ستيل', 'مطابخ مطاعم'],
  },
  {
    id: 'trade_cnc_laser_cutting',
    category: 'manufacturing_production',
    name: { fr: 'Usinage CNC & Découpe Laser Industrielle', ar: 'خراطة وتفريز بالليزر وCNC', en: 'CNC Machining & Laser Cutting' },
    badge: { fr: 'Tolerie Fine & CNC', ar: 'قص ليزر وCNC', en: 'CNC Laser' },
    keywords: ['laser cutting', 'cnc', 'decoupe laser', 'fraisage', 'قص ليزر', 'خراطة سي ان سي'],
  },

  // 13. Legal Cabinet, Notary & Accounting
  {
    id: 'trade_law_firm',
    category: 'legal_accounting',
    name: { fr: 'Cabinet d’Avocat à la Cour', ar: 'مكتب محاماة معتمد لدى المحاكم', en: 'Law Firm & Counsel' },
    badge: { fr: 'Dossiers & Plaidoiries', ar: 'محاماة وقضايا', en: 'Law Firm' },
    keywords: ['avocat', 'cabinet avocat', 'contentieux', 'tribunal', 'justice', 'محامي', 'مكتب محاماة', 'قضاء'],
  },
  {
    id: 'trade_cpa_accounting_firm',
    category: 'legal_accounting',
    name: { fr: 'Cabinet d’Expertise Comptable & Audit', ar: 'مكتب خبير محاسب ومحافظ حسابات', en: 'Chartered Accounting & Audit Firm' },
    badge: { fr: 'Bilans & Déclarations', ar: 'محاسبة وتدقيق', en: 'Accounting' },
    keywords: ['comptable', 'expert comptable', 'audit', 'bilan', 'g50', 'خبير محاسب', 'محاسبة'],
  },
  {
    id: 'trade_notary_office',
    category: 'legal_accounting',
    name: { fr: 'Étude Notariale', ar: 'مكتب موثق معتمد', en: 'Notary Public Office' },
    badge: { fr: 'Actes Authentiques', ar: 'توثيق رسمي', en: 'Notary' },
    keywords: ['notaire', 'etude notariale', 'acte notarie', 'موثق', 'مكتب توثيق'],
  },
  {
    id: 'trade_tax_legal_consulting',
    category: 'legal_accounting',
    name: { fr: 'Cabinet de Conseil Juridique & Fiscal', ar: 'مكتب استشارات قانونية وجبائية', en: 'Tax & Legal Advisory Practice' },
    badge: { fr: 'Fiscalité & Contrats', ar: 'استشارات جبائية', en: 'Tax & Legal' },
    keywords: ['conseil fiscal', 'juriste', 'droit fiscal', 'استشارات قانونية', 'جبايات'],
  },
  {
    id: 'trade_statutory_audit',
    category: 'legal_accounting',
    name: { fr: 'Commissariat aux Comptes Agréé', ar: 'محافظة حسابات ومراقبة مالية معتمدة', en: 'Statutory Auditing Practice' },
    badge: { fr: 'Certif. des Comptes', ar: 'مراقبة حسابات', en: 'Statutory Audit' },
    keywords: ['commissaire aux comptes', 'cac', 'certification bilan', 'محافظ حسابات'],
  },
  {
    id: 'trade_bailiff_office',
    category: 'legal_accounting',
    name: { fr: 'Étude d’Huissier de Justice', ar: 'مكتب محضر قضائي معتمد', en: 'Judicial Bailiff Office' },
    badge: { fr: 'Constats & Signifs', ar: 'محضر قضائي', en: 'Bailiff' },
    keywords: ['huissier de justice', 'constat', 'signification', 'محضر قضائي', 'تبليغ قضائي'],
  },
  {
    id: 'trade_corporate_law',
    category: 'legal_accounting',
    name: { fr: 'Avocat d’Affaires & Droit des Sociétés', ar: 'محاماة شركات وأعمال تجارية', en: 'Corporate & Commercial Law Firm' },
    badge: { fr: 'Statuts & Fusions', ar: 'قانون شركات', en: 'Corporate Law' },
    keywords: ['droit des societes', 'fusion', 'contrat commercial', 'محامي شركات'],
  },
  {
    id: 'trade_payroll_hr_advisory',
    category: 'legal_accounting',
    name: { fr: 'Cabinet d’Externalisation Paie & Social', ar: 'مكتب تسيير الرواتب والموارد البشرية', en: 'Payroll & Social Security Advisory' },
    badge: { fr: 'Fiches Paie & CNAS', ar: 'رواتب وتأمينات', en: 'Payroll' },
    keywords: ['gestion paie', 'cnas', 'cacobatph', 'fiches de paie', 'رواتب', 'تأمينات اجتماعية'],
  },
  {
    id: 'trade_commercial_arbitration',
    category: 'legal_accounting',
    name: { fr: 'Cabinet d’Arbitrage & Médiation Commerciale', ar: 'مكتب تحكيم ومصالحة تجارية', en: 'Arbitration & Commercial Mediation' },
    badge: { fr: 'Médiation', ar: 'تحكيم تجاري', en: 'Arbitration' },
    keywords: ['arbitrage', 'mediation', 'conciliation', 'تحكيم تجاري'],
  },
  {
    id: 'trade_financial_advisory',
    category: 'legal_accounting',
    name: { fr: 'Cabinet de Conseil Financier & Investissement', ar: 'مكتب استشارات مالية واستثمار', en: 'Financial Advisory & Valuation' },
    badge: { fr: 'Business Plans', ar: 'دراسات مالية', en: 'Finance Advisory' },
    keywords: ['conseil financier', 'business plan', 'levee de fonds', 'دراسة جدوى', 'استشارات مالية'],
  },

  // 14. Logistics, Couriers & Delivery
  {
    id: 'trade_express_courier',
    category: 'logistics_delivery',
    name: { fr: 'Entreprise de Livraison Express à Domicile', ar: 'شركة توصيل سريع للمنازل والطرود', en: 'Last-Mile Express Courier' },
    badge: { fr: 'Courses & Suivi', ar: 'توصيل سريع', en: 'Express Delivery' },
    keywords: ['livraison express', 'coursier', 'colis domicile', 'توصيل سريع', 'طرود'],
  },
  {
    id: 'trade_cod_parcel_network',
    category: 'logistics_delivery',
    name: { fr: 'Réseau Messagerie & Encaissement COD (58 Wilayas)', ar: 'شبكة نقل طرود مع الدفع عند الاستلام', en: 'National COD Parcel Delivery Network' },
    badge: { fr: 'Ramassage & CRBT', ar: 'توصيل مع الدفع', en: 'COD Network' },
    keywords: ['cod', 'livraison e-commerce', 'crbt', '58 wilayas', 'دفع عند الاستلام', 'توصيل تجارة الكترونية'],
  },
  {
    id: 'trade_freight_transport',
    category: 'logistics_delivery',
    name: { fr: 'Transporteur Routier de Marchandises & Fret', ar: 'نقل بضائع بالشاحنات ونقل ثقيل', en: 'Heavy Freight & Road Haulage' },
    badge: { fr: 'Poids Lourds', ar: 'نقل بضائع', en: 'Freight' },
    keywords: ['transport marchandises', 'poids lourd', 'semi remorque', 'نقل بضائع', 'شاحنات'],
  },
  {
    id: 'trade_moving_logistics',
    category: 'logistics_delivery',
    name: { fr: 'Entreprise de Déménagement & Manutention', ar: 'شركة ترحيل ونقل أثاث للمنازل والشركات', en: 'Moving, Relocation & Heavy Handling' },
    badge: { fr: 'Déménagements', ar: 'نقل أثاث', en: 'Moving' },
    keywords: ['demenagement', 'monte meuble', 'manutention', 'نقل أثاث', 'ترحيل'],
  },
  {
    id: 'trade_customs_forwarder',
    category: 'logistics_delivery',
    name: { fr: 'Société de Transitaire & Dédouanement', ar: 'مكتب عبور وتخليص جمركي وشحن دولي', en: 'Freight Forwarding & Customs Broker' },
    badge: { fr: 'Dédouanement', ar: 'تخليص جمركي', en: 'Customs' },
    keywords: ['transitaire', 'dedouanement', 'fret aerien', 'fret maritime', 'تخليص جمركي', 'شحن دولي'],
  },
  {
    id: 'trade_moto_couriers',
    category: 'logistics_delivery',
    name: { fr: 'Flotte de Coursiers Urbains à Moto', ar: 'أسطول دراجات نارية للتوصيل السريع', en: 'Urban Moto Courier Fleet' },
    badge: { fr: 'Motos Urbaines', ar: 'توصيل بالدراجات', en: 'Moto Fleet' },
    keywords: ['coursier moto', 'livraison repas', 'pli urgent', 'توصيل بالدراجة'],
  },
  {
    id: 'trade_cold_chain_transport',
    category: 'logistics_delivery',
    name: { fr: 'Transport Frigorifique & Chaîne du Froid', ar: 'نقل وتبريد المواد الغذائية والطبية', en: 'Refrigerated & Cold Chain Logistics' },
    badge: { fr: 'Camions Frigo', ar: 'نقل مبرد', en: 'Cold Chain' },
    keywords: ['transport frigorifique', 'chaine du froid', 'camion frigo', 'نقل مبرد'],
  },
  {
    id: 'trade_ecommerce_fulfillment',
    category: 'logistics_delivery',
    name: { fr: 'Centre de Stockage & Fulfillment E-Commerce', ar: 'مركز تخزين وتغليف لطلبيات المتاجر', en: 'E-Commerce Warehousing & Fulfillment' },
    badge: { fr: 'Stock & Colisage', ar: 'تخزين طرود', en: 'Fulfillment' },
    keywords: ['fulfillment', 'entrepot e-commerce', 'colisage', 'تخزين إلكتروني'],
  },
  {
    id: 'trade_crossdock_hub',
    category: 'logistics_delivery',
    name: { fr: 'Plateforme de Groupage & Hub Logistique', ar: 'مركز تجميع وفرز لوجستي للشحنات', en: 'Cross-Docking & Distribution Hub' },
    badge: { fr: 'Plateformes', ar: 'فرز شحنات', en: 'Cross-Dock' },
    keywords: ['crossdock', 'groupage', 'hub logistique', 'فرز طرود'],
  },
  {
    id: 'trade_heavy_towing',
    category: 'logistics_delivery',
    name: { fr: 'Société de Dépannage & Remorquage Lourd', ar: 'خدمات سحب وشحن المركبات والشاحنات', en: 'Vehicle Recovery & Heavy Towing' },
    badge: { fr: 'Dépanneuses', ar: 'سحب مركبات', en: 'Towing' },
    keywords: ['remorquage', 'depannage auto', 'porte engin', 'سحب سيارات'],
  },

  // 15. Construction & BTP Contracting
  {
    id: 'trade_general_building_contractor',
    category: 'construction_contractor',
    name: { fr: 'Entreprise Générale de Bâtiment (BTP)', ar: 'مقاولة عامة للبناء والأشغال العامة', en: 'General Building Contractor' },
    badge: { fr: 'Gros Œuvre & Devis', ar: 'مقاولة بناء', en: 'Contractor' },
    keywords: ['btp', 'entreprise batiment', 'gros oeuvre', 'chantier', 'مقاولة بناء', 'أشغال عامة', 'مقاول'],
  },
  {
    id: 'trade_civil_works_paving',
    category: 'construction_contractor',
    name: { fr: 'Travaux Publics, Terrassement & Voirie', ar: 'أشغال عمومية وتهيئة الطرق والحفر', en: 'Civil Engineering, Earthworks & Paving' },
    badge: { fr: 'Engins & VRD', ar: 'أشغال عمومية', en: 'Civil Works' },
    keywords: ['travaux publics', 'vrd', 'terrassement', 'goudronnage', 'أشغال عمومية', 'حفر وطرقات'],
  },
  {
    id: 'trade_building_electrical',
    category: 'construction_contractor',
    name: { fr: 'Électricité du Bâtiment & Tertiaire', ar: 'مقاولة كهرباء المباني والتجهيزات الصناعية', en: 'Commercial & Building Electrical' },
    badge: { fr: 'Armoires & Câblage', ar: 'كهرباء مباني', en: 'Electrical' },
    keywords: ['electricite batiment', 'armoire electrique', 'tableaux', 'كهرباء عمارات'],
  },
  {
    id: 'trade_plumbing_hvac',
    category: 'construction_contractor',
    name: { fr: 'Plomberie, Chauffage Central & Climatisation', ar: 'سباكة وتدفئة مركزية وتكييف عمارات', en: 'Plumbing & HVAC Contractor' },
    badge: { fr: 'Chaufferie & Tubes', ar: 'سباكة وتدفئة', en: 'Plumbing / HVAC' },
    keywords: ['plomberie', 'chauffage central', 'climatisation batiment', 'سباكة', 'تدفئة مركزية'],
  },
  {
    id: 'trade_finishing_drywall',
    category: 'construction_contractor',
    name: { fr: 'Peinture, Plâtrerie & Faux-Plafonds (BA13)', ar: 'دهان عمارات وجبس وتهيئة داخلية BA13', en: 'Drywall, BA13 & Interior Finishing' },
    badge: { fr: 'Second Œuvre', ar: 'دهان وجبس', en: 'Drywall' },
    keywords: ['ba13', 'faux plafond', 'platrerie', 'peinture batiment', 'جبس', 'دهان عمارات'],
  },
  {
    id: 'trade_waterproofing_insulation',
    category: 'construction_contractor',
    name: { fr: 'Étanchéité Terrasses & Isolation Thermique', ar: 'عزل مائي وحراري للأسطح والمباني', en: 'Roof Waterproofing & Insulation' },
    badge: { fr: 'Bitume & Résines', ar: 'عزل أسطح', en: 'Insulation' },
    keywords: ['etancheite', 'isolation thermique', 'goudron terrasse', 'عزل مائي', 'عزل حراري'],
  },
  {
    id: 'trade_steel_framing',
    category: 'construction_contractor',
    name: { fr: 'Charpente Métallique & Hangars Industriels', ar: 'هياكل معدنية وبناء مستودعات وهناغر', en: 'Steel Framing & Industrial Sheds' },
    badge: { fr: 'Hangars & Poutres', ar: 'هياكل معدنية', en: 'Steel Structure' },
    keywords: ['charpente metallique', 'hangar', 'bardage', 'هيكل معدني', 'هناغر'],
  },
  {
    id: 'trade_tiling_flooring',
    category: 'construction_contractor',
    name: { fr: 'Carrelage, Faïence & Chape de Sol', ar: 'تركيب سيراميك وبلاط ورخام الأرضيات', en: 'Tiling, Flooring & Screed' },
    badge: { fr: 'Revêtement Sols', ar: 'سيراميك وبلاط', en: 'Tiling' },
    keywords: ['carrelage', 'faience', 'dalle de sol', 'سيراميك', 'بلاط'],
  },
  {
    id: 'trade_landscaping_earth',
    category: 'construction_contractor',
    name: { fr: 'Aménagement Extérieur & Espaces Verts', ar: 'تهيئة خارجية ومساحات خضراء وأرصفة', en: 'External Groundworks & Landscaping' },
    badge: { fr: 'Voirie & Parcs', ar: 'تهيئة خارجية', en: 'Landscaping' },
    keywords: ['espaces verts', 'amenagement exterieur', 'pave', 'تهيئة حدائق'],
  },
  {
    id: 'trade_demolition_site',
    category: 'construction_contractor',
    name: { fr: 'Démolition & Nettoyage de Chantiers', ar: 'هدم وتفكيك وتنظيف مخلفات البناء', en: 'Site Demolition & Debris Clearing' },
    badge: { fr: 'Déblaiement', ar: 'هدم وتنظيف', en: 'Demolition' },
    keywords: ['demolition', 'deblaiement', 'gravats', 'هدم بنايات', 'رفع مخلفات'],
  },

  // 16. Agriculture & Livestock Farming
  {
    id: 'trade_greenhouse_farming',
    category: 'agriculture_farming',
    name: { fr: 'Maraîchage sous Serres & Légumes', ar: 'زراعة خضروات وبيوت بلاستيكية', en: 'Greenhouse & Vegetable Farming' },
    badge: { fr: 'Serres & Récoltes', ar: 'بيوت بلاستيكية', en: 'Greenhouses' },
    keywords: ['maraichage', 'serre', 'tomates', 'legumes', 'بيوت بلاستيكية', 'خضروات', 'فلاحة'],
  },
  {
    id: 'trade_orchard_fruit',
    category: 'agriculture_farming',
    name: { fr: 'Arboriculture Fruitière & Vergers', ar: 'زراعة الأشجار المثمرة والحمضيات', en: 'Fruit Orchards & Arboriculture' },
    badge: { fr: 'Vergers & Arbres', ar: 'أشجار مثمرة', en: 'Orchard' },
    keywords: ['arboriculture', 'verger', 'orangers', 'pommiers', 'أشجار مثمرة', 'بساتين'],
  },
  {
    id: 'trade_poultry_farm',
    category: 'agriculture_farming',
    name: { fr: 'Ferme Avicole (Poulets de chair & Œufs)', ar: 'مدجنة وتربية دواجن ودجاج بياض', en: 'Poultry & Egg Production Farm' },
    badge: { fr: 'Bâtiments Volailles', ar: 'تربية دواجن', en: 'Poultry' },
    keywords: ['avicole', 'poulet', 'elevage volailles', 'oeufs', 'دواجن', 'تربية دجاج', 'بيض'],
  },
  {
    id: 'trade_dairy_cattle',
    category: 'agriculture_farming',
    name: { fr: 'Élevage Bovin Laitier & Engraissement', ar: 'تربية الأبقار وإنتاج الحليب وتسمين العجول', en: 'Dairy & Beef Cattle Ranch' },
    badge: { fr: 'Cheptel Bovin', ar: 'تربية أبقار', en: 'Cattle Ranch' },
    keywords: ['elevage bovin', 'vaches laitieres', 'lait', 'تربية أبقار', 'حليب'],
  },
  {
    id: 'trade_sheep_goat_farming',
    category: 'agriculture_farming',
    name: { fr: 'Élevage Ovin & Caprin (Moutons / Chèvres)', ar: 'تربية الأغنام والمواشي والماعز', en: 'Sheep & Goat Farming' },
    badge: { fr: 'Troupeaux Ovins', ar: 'تربية مواشي', en: 'Sheep / Goats' },
    keywords: ['elevage ovin', 'moutons', 'agneaux', 'تربية أغنام', 'مواشي'],
  },
  {
    id: 'trade_cereal_farming',
    category: 'agriculture_farming',
    name: { fr: 'Exploitation Céréalière (Blé dur, Orge)', ar: 'زراعة الحبوب والقمح والشعير', en: 'Cereal & Grain Crop Farming' },
    badge: { fr: 'Hectares Céréales', ar: 'زراعة حبوب', en: 'Cereal Crops' },
    keywords: ['cereales', 'ble dur', 'orge', 'moisson', 'حبوب', 'قمح', 'شعير'],
  },
  {
    id: 'trade_olive_groves',
    category: 'agriculture_farming',
    name: { fr: 'Exploitation Oléicole & Huilerie Traditionnelle', ar: 'زراعة الزيتون ومعصرة زيت زيتون', en: 'Olive Groves & Olive Oil Mill' },
    badge: { fr: 'Oliviers & Huile', ar: 'زيتون ومعصرة', en: 'Olive Groves' },
    keywords: ['oleiculture', 'oliviers', 'huile d olive', 'معصرة زيتون', 'زيت زيتون'],
  },
  {
    id: 'trade_beekeeping',
    category: 'agriculture_farming',
    name: { fr: 'Apiculture & Production de Miel', ar: 'تربية النحل وإنتاج العسل الطبيعي', en: 'Apiculture & Honey Production' },
    badge: { fr: 'Ruches & Essaims', ar: 'تربية نحل', en: 'Beekeeping' },
    keywords: ['apiculture', 'ruches', 'miel', 'تربية نحل', 'عسل'],
  },
  {
    id: 'trade_plant_nursery',
    category: 'agriculture_farming',
    name: { fr: 'Pépinière Horticole & Plants Maraîchers', ar: 'مشتلة نباتات وأشجار وشجيرات', en: 'Horticultural & Plant Nursery' },
    badge: { fr: 'Plants & Serres', ar: 'مشتلة نباتات', en: 'Plant Nursery' },
    keywords: ['pepiniere', 'plants', 'arbustes', 'fleurs', 'مشتلة', 'نباتات'],
  },
  {
    id: 'trade_crop_packaging',
    category: 'agriculture_farming',
    name: { fr: 'Station de Conditionnement de Fruits & Légumes', ar: 'محطة فرز وتوضيب المحاصيل الفلاحية', en: 'Fruit & Vegetable Packing Station' },
    badge: { fr: 'Calibrage & Caisses', ar: 'توضيب محاصيل', en: 'Packing Station' },
    keywords: ['conditionnement fruits', 'calibrage', 'chambre froide agri', 'توضيب فواكه', 'تبريد فلاحي'],
  },
];

export const searchBusinessCatalog = (query: string): CatalogBusinessTrade[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return FULL_16_VERTICAL_CATALOG.slice(0, 36);

  return FULL_16_VERTICAL_CATALOG.filter((trade) => {
    if (trade.name.fr.toLowerCase().includes(normalized)) return true;
    if (trade.name.ar.includes(normalized)) return true;
    if (trade.name.en.toLowerCase().includes(normalized)) return true;
    return trade.keywords.some((kw) => kw.toLowerCase().includes(normalized));
  });
};

