import fs from 'fs';

const content = fs.readFileSync('src/utils/i18n.ts', 'utf8');

function extractDict(marker) {
  const start = content.indexOf('const ' + marker);
  const next = content.indexOf('const TRANSLATIONS_', start + marker.length);
  const end = next === -1 ? content.indexOf('export const t =', start) : next;
  const section = content.substring(start, end);
  const dict = {};
  const regex = /^\s*([a-zA-Z0-9_]+)\s*:\s*(['"`])([\s\S]*?)\2\s*,/gm;
  let match;
  while ((match = regex.exec(section)) !== null) {
    dict[match[1]] = match[3];
  }
  return dict;
}

const en = extractDict('TRANSLATIONS_EN');
const fr = extractDict('TRANSLATIONS_FR');
const ar = extractDict('TRANSLATIONS_AR');

const pmKeys = Object.keys(en).filter(k => k.startsWith('pm_'));
console.log(`Total pm_ keys found in dictionaries: ${pmKeys.length}`);

let untranslatedInEn = [];
let untranslatedInAr = [];
let keyNameAsValue = [];

for (const k of pmKeys) {
  const enVal = en[k] || '';
  const frVal = fr[k] || '';
  const arVal = ar[k] || '';

  // Check if value equals key name
  if (enVal === k || frVal === k || arVal === k) {
    keyNameAsValue.push(k);
  }

  // Check if AR value contains Latin characters (meaning it was not translated to Arabic!)
  if (/[a-zA-Z]/.test(arVal) && !['SFP 01', 'DA', 'DZD', 'CCP', 'RIP', '5G', 'BORDEREAU', 'SFP01'].includes(arVal.trim())) {
    // If it has mostly Latin words
    const latinWords = arVal.match(/[a-zA-Z]{3,}/g);
    if (latinWords && latinWords.length > 1) {
      untranslatedInAr.push({ key: k, ar: arVal, fr: frVal });
    }
  }

  // Check if EN value is identical to French value (often indicates French untranslated in EN)
  if (enVal === frVal && enVal.length > 5 && !['SFP 01', 'DZD', 'CCP'].includes(enVal)) {
    // Check if it has French characters or typical French words
    if (/[éèêëàâôûîïçÉÈÊËÀÂÔÛÎÏÇ]/.test(enVal) || /\b(les|des|du|la|le|dans|avec|pour|par|sur|est|sont|frais|dossier|bordereau|de|en|et)\b/i.test(enVal)) {
      untranslatedInEn.push({ key: k, en: enVal, fr: frVal });
    }
  }
}

console.log(`\nKeys with value === key name: ${keyNameAsValue.length}`);
if (keyNameAsValue.length > 0) console.log(keyNameAsValue);

console.log(`\npm_ keys in EN that are still in French: ${untranslatedInEn.length}`);
untranslatedInEn.forEach(item => {
  console.log(`- ${item.key}: "${item.en}"`);
});

console.log(`\npm_ keys in AR that have Latin/French text: ${untranslatedInAr.length}`);
untranslatedInAr.forEach(item => {
  console.log(`- ${item.key}: "${item.ar}"`);
});
