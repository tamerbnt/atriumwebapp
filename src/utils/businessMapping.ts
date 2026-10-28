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

