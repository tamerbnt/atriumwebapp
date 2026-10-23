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
    'clinic',
    'clinique',
    'dental',
    'dentiste',
    'dental clinic',
    'cabinet dentaire',
    'physiotherapy',
    'physio',
    'kine',
    'kinesitherapie',
    'chiropractor',
    'osteopathe',
    'tattoo',
    'tattoo parlor',
    'tatouage',
    'piercing',
    'dermatology',
    'dermatologue',
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
};

export const POPULAR_BUSINESS_SEARCHES = [
  { label: 'Barbershop', query: 'barbershop', category: 'appointment_service' as BusinessCategory },
  { label: 'CrossFit / Gym', query: 'crossfit gym', category: 'membership_session' as BusinessCategory },
  { label: 'Café & Restaurant', query: 'cafe restaurant', category: 'pos_inventory' as BusinessCategory },
  { label: 'Freelance Dev & Design', query: 'freelance dev', category: 'freelance_solo' as BusinessCategory },
  { label: 'Marketing Agency', query: 'marketing agency', category: 'project_milestone' as BusinessCategory },
  { label: 'Coworking / Studio', query: 'coworking space', category: 'rental_booking' as BusinessCategory },
  { label: 'Language Academy', query: 'language school', category: 'education_cohort' as BusinessCategory },
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
