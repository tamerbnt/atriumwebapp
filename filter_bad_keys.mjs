import fs from 'fs';

const data = JSON.parse(fs.readFileSync('pm_keys_dump.json', 'utf8'));

const badEn = [];
const badAr = [];

for (const [k, v] of Object.entries(data)) {
  const en = v.en;
  const fr = v.fr;
  const ar = v.ar;

  // Check if EN is French
  if (/[éèêëàâôûîïçÉÈÊËÀÂÔÛÎÏÇ]/.test(en) || /\b(les|des|du|la|le|dans|avec|pour|par|sur|est|sont|frais|dossier|bordereau|de|en|et|cahier|charges|épreuve|imprimeur|pointage|animateur|livrable|projet|campagne)\b/i.test(en)) {
    if (!['SFP 01', 'DZD', 'CCP', 'RIP'].includes(en)) {
      badEn.push({ key: k, en, fr });
    }
  }

  // Check if AR is French or Latin
  if (/[éèêëàâôûîïçÉÈÊËÀÂÔÛÎÏÇ]/.test(ar) || (/[a-zA-Z]{3,}/.test(ar) && !ar.includes('DA') && !ar.includes('CCP') && !ar.includes('SFP') && !ar.includes('5G'))) {
    badAr.push({ key: k, ar, fr });
  }
}

console.log(`Bad EN count: ${badEn.length}`);
console.log(`Bad AR count: ${badAr.length}`);

fs.writeFileSync('bad_en_keys.json', JSON.stringify(badEn, null, 2));
fs.writeFileSync('bad_ar_keys.json', JSON.stringify(badAr, null, 2));
console.log('Saved bad_en_keys.json and bad_ar_keys.json');
