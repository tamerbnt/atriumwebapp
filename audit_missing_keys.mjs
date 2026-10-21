import fs from 'fs';
import path from 'path';

const i18nContent = fs.readFileSync('src/utils/i18n.ts', 'utf8');

function extractKeysFromObject(startMarker, endMarker) {
  const startIdx = i18nContent.indexOf(startMarker);
  const endIdx = i18nContent.indexOf(endMarker, startIdx);
  const chunk = i18nContent.slice(startIdx, endIdx);
  const keys = new Map(); // key -> value
  const regex = /^\s*([a-zA-Z0-9_]+)\s*:\s*('([^'\\]|\\.)*'|"([^"\\]|\\.)*")/gm;
  let m;
  while ((m = regex.exec(chunk)) !== null) {
    keys.set(m[1], m[2]);
  }
  return keys;
}

const enDict = extractKeysFromObject('const TRANSLATIONS_EN = {', 'const TRANSLATIONS_FR');
const frDict = extractKeysFromObject('const TRANSLATIONS_FR', 'const TRANSLATIONS_AR');
const arDict = extractKeysFromObject('const TRANSLATIONS_AR', 'export const DICTIONARY');

console.log(`Dictionary size: EN=${enDict.size}, FR=${frDict.size}, AR=${arDict.size}`);

// Gather all t('...') calls across project files
function getFiles(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      res = res.concat(getFiles(full));
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      res.push(full);
    }
  }
  return res;
}

const projectFiles = [
  ...getFiles('src/components/screens/project'),
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/TopBar.tsx',
  'src/App.tsx',
  'src/services/store.ts'
];

const missingInEn = new Set();
const missingInFr = new Set();
const missingInAr = new Set();
const allReferencedPmKeys = new Set();

for (const file of projectFiles) {
  const code = fs.readFileSync(file, 'utf8');
  // Match t('key' or t("key"
  const matches = code.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_]+)['"]/g);
  for (const m of matches) {
    const k = m[1];
    if (k.startsWith('pm_') || k.startsWith('nav_pm_') || file.includes('screens/project')) {
      allReferencedPmKeys.add({ key: k, file });
      if (!enDict.has(k)) missingInEn.add(`${k} (in ${file})`);
      if (!frDict.has(k)) missingInFr.add(`${k} (in ${file})`);
      if (!arDict.has(k)) missingInAr.add(`${k} (in ${file})`);
    }
  }
}

console.log('\n--- Missing in EN ---');
console.log(Array.from(missingInEn));

console.log('\n--- Missing in FR ---');
console.log(Array.from(missingInFr));

console.log('\n--- Missing in AR ---');
console.log(Array.from(missingInAr));

// Also check if any key in EN is untranslated (i.e. identical in AR to EN or identical in FR to EN where it shouldn't be)
const untranslatedAr = [];
for (const [k, v] of arDict.entries()) {
  if (k.startsWith('pm_') || k.startsWith('nav_pm_')) {
    const enVal = enDict.get(k);
    if (enVal && enVal === v && !v.includes('CCP') && !v.includes('DA') && !v.includes('DZD') && !v.includes('58') && !v.includes('300 DPI') && !v.includes('CMJN') && !v.includes('KV') && !v.includes('BAT')) {
      untranslatedAr.push(`${k}: ${v}`);
    }
  }
}
console.log('\n--- Untranslated in AR (identical to EN) ---');
console.log(untranslatedAr);
