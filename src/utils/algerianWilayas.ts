import { WilayaZone } from './logisticsRules';

export interface WilayaInfo {
  code: number;
  nameFr: string;
  nameAr: string;
  zone: WilayaZone;
  communes: string[];
}

export const ALGERIA_58_WILAYAS: WilayaInfo[] = [
  { code: 1, nameFr: 'Adrar', nameAr: 'أدرار', zone: 'Zone5_Sud', communes: ['Adrar', 'Reggane', 'Timimoun', 'Aoulef'] },
  { code: 2, nameFr: 'Chlef', nameAr: 'الشلف', zone: 'Zone3_Nord', communes: ['Chlef', 'Ténès', 'El Karimia', 'Boukadir'] },
  { code: 3, nameFr: 'Laghouat', nameAr: 'الأغواط', zone: 'Zone5_Sud', communes: ['Laghouat', 'Aflou', 'Ksar El Hirane'] },
  { code: 4, nameFr: 'Oum El Bouaghi', nameAr: 'أم البواقي', zone: 'Zone4_Plateaux', communes: ['Oum El Bouaghi', 'Aïn Beïda', 'Aïn M\'lila'] },
  { code: 5, nameFr: 'Batna', nameAr: 'باتنة', zone: 'Zone4_Plateaux', communes: ['Batna', 'Barika', 'Aïn Touta', 'Merouana'] },
  { code: 6, nameFr: 'Béjaïa', nameAr: 'بجاية', zone: 'Zone3_Nord', communes: ['Béjaïa', 'Akbou', 'Amizour', 'El Kseur'] },
  { code: 7, nameFr: 'Biskra', nameAr: 'بسكرة', zone: 'Zone5_Sud', communes: ['Biskra', 'Tolga', 'Ouled Djellal', 'Sidi Okba'] },
  { code: 8, nameFr: 'Béchar', nameAr: 'بشار', zone: 'Zone5_Sud', communes: ['Béchar', 'Béni Abbès', 'Kenadsa', 'Taghit'] },
  { code: 9, nameFr: 'Blida', nameAr: 'البليدة', zone: 'Zone2_Proche', communes: ['Blida', 'Boufarik', 'Ouled Yaïch', 'Mouzaïa', 'El Affroun'] },
  { code: 10, nameFr: 'Bouira', nameAr: 'البويرة', zone: 'Zone3_Nord', communes: ['Bouira', 'Lakhdaria', 'Sour El Ghozlane', 'Aïn Bessem'] },
  { code: 11, nameFr: 'Tamanrasset', nameAr: 'تمنراست', zone: 'Zone6_GrandSud', communes: ['Tamanrasset', 'In Salah', 'Abalessa'] },
  { code: 12, nameFr: 'Tébessa', nameAr: 'تبسة', zone: 'Zone4_Plateaux', communes: ['Tébessa', 'Chréa', 'Bir El Ater', 'El Aouinet'] },
  { code: 13, nameFr: 'Tlemcen', nameAr: 'تلمسان', zone: 'Zone3_Nord', communes: ['Tlemcen', 'Mansourah', 'Maghnia', 'Ghazaouet', 'Chetouane'] },
  { code: 14, nameFr: 'Tiaret', nameAr: 'تيارت', zone: 'Zone4_Plateaux', communes: ['Tiaret', 'Sougueur', 'Frenda', 'Ksar Chellala'] },
  { code: 15, nameFr: 'Tizi Ouzou', nameAr: 'تيزي وزو', zone: 'Zone3_Nord', communes: ['Tizi Ouzou', 'Draâ Ben Khedda', 'Azazga', 'Boghni', 'Larbaâ Nath Irathen'] },
  { code: 16, nameFr: 'Alger', nameAr: 'الجزائر', zone: 'Zone1_Local', communes: ['Kouba', 'Bab Ezzouar', 'Hydra', 'Chéraga', 'Hussein Dey', 'Sidi M\'Hamed', 'El Biar', 'Dely Ibrahim', 'Zéralda', 'Birtouta', 'Rouïba', 'Bordj El Kiffan', 'El Harrach'] },
  { code: 17, nameFr: 'Djelfa', nameAr: 'الجلفة', zone: 'Zone4_Plateaux', communes: ['Djelfa', 'Aïn Oussera', 'Messaâd', 'Hassi Bahbah'] },
  { code: 18, nameFr: 'Jijel', nameAr: 'جيجل', zone: 'Zone3_Nord', communes: ['Jijel', 'Taher', 'El Milia', 'El Aouana'] },
  { code: 19, nameFr: 'Sétif', nameAr: 'سطيف', zone: 'Zone3_Nord', communes: ['Sétif', 'El Eulma', 'Aïn Oulmene', 'Aïn Arnat', 'Bougaa'] },
  { code: 20, nameFr: 'Saïda', nameAr: 'سعيدة', zone: 'Zone4_Plateaux', communes: ['Saïda', 'Aïn El Hadjar', 'Youb'] },
  { code: 21, nameFr: 'Skikda', nameAr: 'سكيكدة', zone: 'Zone3_Nord', communes: ['Skikda', 'El Harrouch', 'Azzaba', 'Collo'] },
  { code: 22, nameFr: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', zone: 'Zone3_Nord', communes: ['Sidi Bel Abbès', 'Telagh', 'Sfisef', 'Ben Badis'] },
  { code: 23, nameFr: 'Annaba', nameAr: 'عنابة', zone: 'Zone3_Nord', communes: ['Annaba', 'El Bouni', 'El Hadjar', 'Berrahal', 'Seraïdi'] },
  { code: 24, nameFr: 'Guelma', nameAr: 'قالمة', zone: 'Zone3_Nord', communes: ['Guelma', 'Oued Zenati', 'Bouchegouf', 'Héliopolis'] },
  { code: 25, nameFr: 'Constantine', nameAr: 'قسنطينة', zone: 'Zone3_Nord', communes: ['Constantine', 'El Khroub', 'Ali Mendjeli', 'Hamma Bouziane', 'Didouche Mourad'] },
  { code: 26, nameFr: 'Médéa', nameAr: 'المدية', zone: 'Zone3_Nord', communes: ['Médéa', 'Berrouaghia', 'Ksar El Boukhari', 'Beni Slimane'] },
  { code: 27, nameFr: 'Mostaganem', nameAr: 'مستغانم', zone: 'Zone3_Nord', communes: ['Mostaganem', 'Aïn Tedeles', 'Hassi Mameche', 'Sidi Ali'] },
  { code: 28, nameFr: 'M\'Sila', nameAr: 'المسيلة', zone: 'Zone4_Plateaux', communes: ['M\'Sila', 'Boussaâda', 'Sidi Aïssa', 'Magra'] },
  { code: 29, nameFr: 'Mascara', nameAr: 'معسكر', zone: 'Zone3_Nord', communes: ['Mascara', 'Sig', 'Tighennif', 'Mohammadia'] },
  { code: 30, nameFr: 'Ouargla', nameAr: 'ورقلة', zone: 'Zone5_Sud', communes: ['Ouargla', 'Hassi Messaoud', 'Touggourt', 'Rouissat'] },
  { code: 31, nameFr: 'Oran', nameAr: 'وهران', zone: 'Zone3_Nord', communes: ['Oran', 'Bir El Djir', 'Es Senia', 'Arzew', 'Aïn El Turk', 'Bethioua'] },
  { code: 32, nameFr: 'El Bayadh', nameAr: 'البيض', zone: 'Zone5_Sud', communes: ['El Bayadh', 'Rogassa', 'Brezina'] },
  { code: 33, nameFr: 'Illizi', nameAr: 'إيليزي', zone: 'Zone6_GrandSud', communes: ['Illizi', 'Djanet', 'In Amenas'] },
  { code: 34, nameFr: 'Bordj Bou Arréridj', nameAr: 'برج بوعريريج', zone: 'Zone3_Nord', communes: ['Bordj Bou Arréridj', 'Ras El Oued', 'Mansoura'] },
  { code: 35, nameFr: 'Boumerdès', nameAr: 'بومرداس', zone: 'Zone2_Proche', communes: ['Boumerdès', 'Zemmouri', 'Dellys', 'Khemis El Khechna', 'Boudouaou'] },
  { code: 36, nameFr: 'El Tarf', nameAr: 'الطارف', zone: 'Zone3_Nord', communes: ['El Tarf', 'Ben M\'Hidi', 'Besbes', 'El Kala'] },
  { code: 37, nameFr: 'Tindouf', nameAr: 'تندوف', zone: 'Zone6_GrandSud', communes: ['Tindouf', 'Oum El Assel'] },
  { code: 38, nameFr: 'Tissemsilt', nameAr: 'تيسمسيلت', zone: 'Zone4_Plateaux', communes: ['Tissemsilt', 'Theniet El Had', 'Khemisti'] },
  { code: 39, nameFr: 'El Oued', nameAr: 'الوادي', zone: 'Zone5_Sud', communes: ['El Oued', 'Djamaa', 'Guemar', 'Robbah'] },
  { code: 40, nameFr: 'Khenchela', nameAr: 'خنشلة', zone: 'Zone4_Plateaux', communes: ['Khenchela', 'Kaïs', 'Chechar'] },
  { code: 41, nameFr: 'Souk Ahras', nameAr: 'سوق أهراس', zone: 'Zone3_Nord', communes: ['Souk Ahras', 'Seddrata', 'Taoura'] },
  { code: 42, nameFr: 'Tipaza', nameAr: 'تيبازة', zone: 'Zone2_Proche', communes: ['Tipaza', 'Koléa', 'Cherchell', 'Bou Ismaïl', 'Hadout'] },
  { code: 43, nameFr: 'Mila', nameAr: 'ميلة', zone: 'Zone4_Plateaux', communes: ['Mila', 'Chelghoum Laïd', 'Tadjenanet', 'Ferdjioua'] },
  { code: 44, nameFr: 'Aïn Defla', nameAr: 'عين الدفلى', zone: 'Zone3_Nord', communes: ['Aïn Defla', 'Khemis Miliana', 'El Attaf'] },
  { code: 45, nameFr: 'Naâma', nameAr: 'النعامة', zone: 'Zone5_Sud', communes: ['Naâma', 'Mécheria', 'Aïn Sefra'] },
  { code: 46, nameFr: 'Aïn Témouchent', nameAr: 'عين تموشنت', zone: 'Zone3_Nord', communes: ['Aïn Témouchent', 'Béni Saf', 'Hammam Bou Hadjar'] },
  { code: 47, nameFr: 'Ghardaïa', nameAr: 'غرداية', zone: 'Zone5_Sud', communes: ['Ghardaïa', 'El Guerrara', 'Metlili', 'Béni Isguen'] },
  { code: 48, nameFr: 'Relizane', nameAr: 'غليزان', zone: 'Zone3_Nord', communes: ['Relizane', 'Oued Rhiou', 'Mazouna'] },
  { code: 49, nameFr: 'Timimoun', nameAr: 'تيميمون', zone: 'Zone5_Sud', communes: ['Timimoun', 'Aougrout', 'Tinerkouk'] },
  { code: 50, nameFr: 'Bordj Badji Mokhtar', nameAr: 'برج باجي مختار', zone: 'Zone6_GrandSud', communes: ['Bordj Badji Mokhtar', 'Timiaouine'] },
  { code: 51, nameFr: 'Ouled Djellal', nameAr: 'أولاد جلال', zone: 'Zone5_Sud', communes: ['Ouled Djellal', 'Sidi Khaled', 'Ras El Miaad'] },
  { code: 52, nameFr: 'Béni Abbès', nameAr: 'بني عباس', zone: 'Zone5_Sud', communes: ['Béni Abbès', 'Kerzaz', 'Tabelbala'] },
  { code: 53, nameFr: 'In Salah', nameAr: 'عين صالح', zone: 'Zone6_GrandSud', communes: ['In Salah', 'Foggaret Ezzaouia', 'In Ghar'] },
  { code: 54, nameFr: 'In Guezzam', nameAr: 'عين قزام', zone: 'Zone6_GrandSud', communes: ['In Guezzam', 'Tin Zaouatine'] },
  { code: 55, nameFr: 'Touggourt', nameAr: 'تقرت', zone: 'Zone5_Sud', communes: ['Touggourt', 'Taibet', 'Temacine'] },
  { code: 56, nameFr: 'Djanet', nameAr: 'جانت', zone: 'Zone6_GrandSud', communes: ['Djanet', 'Bordj El Haouas'] },
  { code: 57, nameFr: 'El M\'Ghair', nameAr: 'المغير', zone: 'Zone5_Sud', communes: ['El M\'Ghair', 'Djamaa'] },
  { code: 58, nameFr: 'El Meniaa', nameAr: 'المنيعة', zone: 'Zone5_Sud', communes: ['El Meniaa', 'Hassi Gara'] },
];

export const ALGERIAN_WILAYAS = ALGERIA_58_WILAYAS;

export function getWilayaByCode(code: number): WilayaInfo | undefined {
  return ALGERIA_58_WILAYAS.find((w) => w.code === code);
}

export function searchWilayas(query: string): WilayaInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALGERIA_58_WILAYAS;
  return ALGERIA_58_WILAYAS.filter(
    (w) =>
      String(w.code) === q ||
      w.nameFr.toLowerCase().includes(q) ||
      w.nameAr.includes(q) ||
      w.communes.some((c) => c.toLowerCase().includes(q))
  );
}
