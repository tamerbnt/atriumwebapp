import fs from 'fs';
import path from 'path';

const i18nContent = fs.readFileSync('src/utils/i18n.ts', 'utf8');

function extractKeys(sectionName) {
  const marker = 'const ' + sectionName;
  const start = i18nContent.indexOf(marker);
  if (start === -1) return new Set();
  const nextMarker = i18nContent.indexOf('const TRANSLATIONS_', start + marker.length);
  const end = nextMarker === -1 ? i18nContent.indexOf('export const t =', start) : nextMarker;
  const section = i18nContent.substring(start, end);
  const keys = new Set();
  const regex = /^\s*([a-zA-Z0-9_]+)\s*:/gm;
  let match;
  while ((match = regex.exec(section)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

const enKeys = extractKeys('TRANSLATIONS_EN');
const frKeys = extractKeys('TRANSLATIONS_FR');
const arKeys = extractKeys('TRANSLATIONS_AR');

console.log(`Dictionaries count: EN=${enKeys.size}, FR=${frKeys.size}, AR=${arKeys.size}`);

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = getAllFiles('src');
const usedKeys = new Map();

for (const file of allFiles) {
  if (file.includes('i18n.ts')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const regex = /\bt\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const k = match[1];
    if (!usedKeys.has(k)) usedKeys.set(k, new Set());
    usedKeys.get(k).add(file);
  }
}

console.log(`Total unique t() keys used across src: ${usedKeys.size}`);

const missingInEN = [];
const missingInFR = [];
const missingInAR = [];

for (const [k, files] of usedKeys.entries()) {
  if (!enKeys.has(k)) missingInEN.push({ key: k, files: Array.from(files) });
  if (!frKeys.has(k)) missingInFR.push({ key: k, files: Array.from(files) });
  if (!arKeys.has(k)) missingInAR.push({ key: k, files: Array.from(files) });
}

console.log(`Missing in EN: ${missingInEN.length}`);
console.log(`Missing in FR: ${missingInFR.length}`);
console.log(`Missing in AR: ${missingInAR.length}`);

console.log('\n--- Missing in EN details ---');
missingInEN.forEach(m => console.log(`${m.key} in ${m.files.join(', ')}`));

// Also let's check difference between enKeys, frKeys, arKeys
const keysInEnNotInFr = [...enKeys].filter(k => !frKeys.has(k));
const keysInEnNotInAr = [...enKeys].filter(k => !arKeys.has(k));
const keysInFrNotInEn = [...frKeys].filter(k => !enKeys.has(k));
const keysInArNotInEn = [...arKeys].filter(k => !enKeys.has(k));

console.log('\n--- Dictionary asymmetry ---');
console.log(`In EN but not in FR: ${keysInEnNotInFr.length}`);
if (keysInEnNotInFr.length > 0) console.log(keysInEnNotInFr.slice(0, 30));
console.log(`In EN but not in AR: ${keysInEnNotInAr.length}`);
if (keysInEnNotInAr.length > 0) console.log(keysInEnNotInAr.slice(0, 30));
console.log(`In FR but not in EN: ${keysInFrNotInEn.length}`);
if (keysInFrNotInEn.length > 0) console.log(keysInFrNotInEn.slice(0, 30));
console.log(`In AR but not in EN: ${keysInArNotInEn.length}`);
if (keysInArNotInEn.length > 0) console.log(keysInArNotInEn.slice(0, 30));
