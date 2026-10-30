// Atrium ERP & CRM — Algerian Post (CCP) and Territorial Utilities
// Certified for Algérie Poste SFP 01 postal check transfers & 58 Wilayas

export interface Wilaya {
  code: string;
  nameFr: string;
  nameAr: string;
}

export const ALGERIAN_WILAYAS: Wilaya[] = [
  { code: '01', nameFr: 'Adrar', nameAr: 'أدرار' },
  { code: '02', nameFr: 'Chlef', nameAr: 'الشلف' },
  { code: '03', nameFr: 'Laghouat', nameAr: 'الأغواط' },
  { code: '04', nameFr: 'Oum El Bouaghi', nameAr: 'أم البواقي' },
  { code: '05', nameFr: 'Batna', nameAr: 'باتنة' },
  { code: '06', nameFr: 'Béjaïa', nameAr: 'بجاية' },
  { code: '07', nameFr: 'Biskra', nameAr: 'بسكرة' },
  { code: '08', nameFr: 'Béchar', nameAr: 'بشار' },
  { code: '09', nameFr: 'Blida', nameAr: 'البليدة' },
  { code: '10', nameFr: 'Bouira', nameAr: 'البويرة' },
  { code: '11', nameFr: 'Tamanrasset', nameAr: 'تمنراست' },
  { code: '12', nameFr: 'Tébessa', nameAr: 'تبسة' },
  { code: '13', nameFr: 'Tlemcen', nameAr: 'تلمسان' },
  { code: '14', nameFr: 'Tiaret', nameAr: 'تيارت' },
  { code: '15', nameFr: 'Tizi Ouzou', nameAr: 'تيزي وزو' },
  { code: '16', nameFr: 'Alger', nameAr: 'الجزائر' },
  { code: '17', nameFr: 'Djelfa', nameAr: 'الجلفة' },
  { code: '18', nameFr: 'Jijel', nameAr: 'جيجل' },
  { code: '19', nameFr: 'Sétif', nameAr: 'سطيف' },
  { code: '20', nameFr: 'Saïda', nameAr: 'سعيدة' },
  { code: '21', nameFr: 'Skikda', nameAr: 'سكيكدة' },
  { code: '22', nameFr: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس' },
  { code: '23', nameFr: 'Annaba', nameAr: 'عنابة' },
  { code: '24', nameFr: 'Guelma', nameAr: 'قالمة' },
  { code: '25', nameFr: 'Constantine', nameAr: 'قسنطينة' },
  { code: '26', nameFr: 'Médéa', nameAr: 'المدية' },
  { code: '27', nameFr: 'Mostaganem', nameAr: 'مستغانم' },
  { code: '28', nameFr: 'M\'Sila', nameAr: 'المسيلة' },
  { code: '29', nameFr: 'Mascara', nameAr: 'معسكر' },
  { code: '30', nameFr: 'Ouargla', nameAr: 'ورقلة' },
  { code: '31', nameFr: 'Oran', nameAr: 'وهران' },
  { code: '32', nameFr: 'El Bayadh', nameAr: 'البيض' },
  { code: '33', nameFr: 'Illizi', nameAr: 'إليزي' },
  { code: '34', nameFr: 'Bordj Bou Arréridj', nameAr: 'برج بوعريريج' },
  { code: '35', nameFr: 'Boumerdès', nameAr: 'بومرداس' },
  { code: '36', nameFr: 'El Tarf', nameAr: 'الطارف' },
  { code: '37', nameFr: 'Tindouf', nameAr: 'تندوف' },
  { code: '38', nameFr: 'Tissemsilt', nameAr: 'تيسمسيلت' },
  { code: '39', nameFr: 'El Oued', nameAr: 'الوادي' },
  { code: '40', nameFr: 'Khenchela', nameAr: 'خنشلة' },
  { code: '41', nameFr: 'Souk Ahras', nameAr: 'سوق أهراس' },
  { code: '42', nameFr: 'Tipaza', nameAr: 'تيبازة' },
  { code: '43', nameFr: 'Mila', nameAr: 'ميلة' },
  { code: '44', nameFr: 'Aïn Defla', nameAr: 'عين الدفلى' },
  { code: '45', nameFr: 'Naâma', nameAr: 'النعامة' },
  { code: '46', nameFr: 'Aïn Témouchent', nameAr: 'عين تموشنت' },
  { code: '47', nameFr: 'Ghardaïa', nameAr: 'غرداية' },
  { code: '48', nameFr: 'Relizane', nameAr: 'غليزان' },
  { code: '49', nameFr: 'El M\'Ghair', nameAr: 'المغير' },
  { code: '50', nameFr: 'El Meniaa', nameAr: 'المنيعة' },
  { code: '51', nameFr: 'Ouled Djellal', nameAr: 'أولاد جلال' },
  { code: '52', nameFr: 'Bordj Baji Mokhtar', nameAr: 'برج باجي مختار' },
  { code: '53', nameFr: 'Béni Abbès', nameAr: 'بني عباس' },
  { code: '54', nameFr: 'Timimoun', nameAr: 'تيميمون' },
  { code: '55', nameFr: 'Touggourt', nameAr: 'تقرت' },
  { code: '56', nameFr: 'Djanet', nameAr: 'جانت' },
  { code: '57', nameFr: 'In Salah', nameAr: 'عين صالح' },
  { code: '58', nameFr: 'In Guezzam', nameAr: 'عين قزام' },
];

/**
 * Validates official Algérie Poste CCP account numbers and keys.
 * A CCP account number has up to 10 digits; the Clé (key) is 2 numeric digits (01-99).
 */
export function validateCcpAccount(accountNumber: string, cle: string): { isValid: boolean; error?: string } {
  const cleanAccount = accountNumber.replace(/\s+/g, '').replace(/^0+/, '');
  const cleanCle = cle.replace(/\s+/g, '');

  if (!cleanAccount || !/^\d{1,10}$/.test(cleanAccount)) {
    return { isValid: false, error: 'Le numéro CCP doit contenir entre 1 et 10 chiffres' };
  }

  if (!cleanCle || !/^\d{1,2}$/.test(cleanCle)) {
    return { isValid: false, error: 'La clé CCP doit comporter 2 chiffres (01 à 99)' };
  }

  return { isValid: true };
}

/**
 * French Number-to-Words for Algerian Dinar Legal SFP 01 Post Slips.
 */
export function numberToWordsFrench(amount: number): string {
  if (isNaN(amount) || amount < 0) return 'zéro dinar algérien';
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertGroup(n: number): string {
    let res = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) {
      if (h === 1) res += 'cent';
      else res += units[h] + ' cents';
      if (remainder > 0) res += ' ';
    }

    if (remainder > 0) {
      if (remainder < 10) {
        res += units[remainder];
      } else if (remainder < 20) {
        res += teens[remainder - 10];
      } else if (remainder < 70) {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        if (u === 1 && t !== 8) res += tens[t] + ' et un';
        else if (u > 0) res += tens[t] + '-' + units[u];
        else res += tens[t];
      } else if (remainder < 80) {
        const u = remainder % 10;
        if (u === 1) res += 'soixante et onze';
        else res += 'soixante-' + teens[u];
      } else if (remainder < 90) {
        const u = remainder % 10;
        if (u === 0) res += 'quatre-vingts';
        else res += 'quatre-vingt-' + units[u];
      } else {
        const u = remainder % 10;
        res += 'quatre-vingt-' + teens[u];
      }
    }

    return res.trim();
  }

  function numberToWordsInternal(n: number): string {
    if (n === 0) return 'zéro';
    let words = '';

    const billions = Math.floor(n / 1000000000);
    n %= 1000000000;
    const millions = Math.floor(n / 1000000);
    n %= 1000000;
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;

    if (billions > 0) {
      words += convertGroup(billions) + (billions > 1 ? ' milliards ' : ' milliard ');
    }
    if (millions > 0) {
      words += convertGroup(millions) + (millions > 1 ? ' millions ' : ' million ');
    }
    if (thousands > 0) {
      if (thousands === 1) words += 'mille ';
      else words += convertGroup(thousands) + ' mille ';
    }
    if (remainder > 0) {
      words += convertGroup(remainder);
    }

    return words.trim();
  }

  const intWords = numberToWordsInternal(integerPart);
  const currencyString = integerPart > 1 ? 'dinars algériens' : 'dinar algérien';

  let result = `${intWords} ${currencyString}`;
  if (decimalPart > 0) {
    const centimeWords = numberToWordsInternal(decimalPart);
    const centimeString = decimalPart > 1 ? 'centimes' : 'centime';
    result += ` et ${centimeWords} ${centimeString}`;
  } else {
    result += ' et zéro centime';
  }

  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Arabic Number-to-Words for Algerian Dinar Legal SFP 01 Post Slips.
 */
export function numberToWordsArabic(amount: number): string {
  if (isNaN(amount) || amount < 0) return 'صفر دينار جزائري';
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroupAr(n: number): string {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    const parts: string[] = [];

    if (h > 0) parts.push(hundreds[h]);

    if (t === 1) {
      if (o === 0) parts.push('عشرة');
      else if (o === 1) parts.push('أحد عشر');
      else if (o === 2) parts.push('اثنا عشر');
      else parts.push(ones[o] + ' عشر');
    } else {
      if (o > 0) parts.push(ones[o]);
      if (t > 1) parts.push(tens[t]);
    }

    return parts.join(' و ');
  }

  function numberToWordsArInternal(n: number): string {
    if (n === 0) return 'صفر';
    const parts: string[] = [];

    const millions = Math.floor(n / 1000000);
    n %= 1000000;
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;

    if (millions > 0) {
      if (millions === 1) parts.push('مليون');
      else if (millions === 2) parts.push('مليونان');
      else parts.push(convertGroupAr(millions) + ' مليون');
    }

    if (thousands > 0) {
      if (thousands === 1) parts.push('ألف');
      else if (thousands === 2) parts.push('ألفان');
      else if (thousands >= 3 && thousands <= 10) parts.push(convertGroupAr(thousands) + ' آلاف');
      else parts.push(convertGroupAr(thousands) + ' ألف');
    }

    if (remainder > 0) {
      parts.push(convertGroupAr(remainder));
    }

    return parts.join(' و ');
  }

  const intWords = numberToWordsArInternal(integerPart);
  let res = intWords + ' دينار جزائري';

  if (decimalPart > 0) {
    const centimeWords = numberToWordsArInternal(decimalPart);
    res += ' و ' + centimeWords + ' سنتيم';
  } else {
    res += ' ولا سنتيم';
  }

  return res;
}

export const numberToAlgerianWords = numberToWordsFrench;
