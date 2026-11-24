#!/usr/bin/env node
/**
 * Phase 1 CI Guards (Section 12.5)
 * Default (Steps 1-7): Ratchet mode against scripts/ci/phase1-guards-baseline.json
 *   - Fails (exit 1) if ANY metric regresses above baseline.
 * Strict (--strict at Step 8): Fails (exit 1) if totalViolations > 0.
 */
import fs from 'node:fs';
import path from 'node:path';

const STRICT = process.argv.includes('--strict');
const SRC_ROOT = path.resolve(process.cwd(), 'src');
const BASELINE_PATH = path.resolve(process.cwd(), 'scripts/ci/phase1-guards-baseline.json');

function walkFiles(dir, matcher) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'dist') continue;
      out.push(...walkFiles(full, matcher));
    } else if (matcher(full)) {
      out.push(full);
    }
  }
  return out;
}

const tsxFiles = walkFiles(SRC_ROOT, (p) => /\.(ts|tsx)$/.test(p) && !p.endsWith('.test.ts') && !p.endsWith('.test.tsx'));
const rel = (p) => path.relative(process.cwd(), p).replace(/\\/g, '/');

// ---------------------------------------------------------------------------
// Guard 1: showToast-only handlers (no service/store/print/export/state/clipboard side effect)
// ---------------------------------------------------------------------------
const toastOnlyFindings = [];
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/onClick\s*:|onClick\s*=/.test(line)) continue;
    const windowText = lines.slice(i, Math.min(lines.length, i + 10)).join('\n');
    // Match concise single-call `onClick: () => showToast(...)` or `onClick={() => showToast(...)}`
    const arrowMatch = windowText.match(/onClick\s*[:=]\s*\{?\s*\([^)]*\)\s*=>\s*(\{[^}]{0,320}\}|showToast\??\([^;]{0,260}\))/);
    if (!arrowMatch) continue;
    const body = arrowMatch[1];
    if (!body.includes('showToast')) continue;
    const hasSideEffect = /(Service\.|syncCoordinator\.|window\.print|downloadCsv|navigator\.clipboard|set[A-Z][a-zA-Z0-9_]*\(|add[A-Z]|update[A-Z]|delete[A-Z]|handle[A-Z]|registerUndoEntry|create[A-Z]|approve|reject|settle|disburse|export|URL\.createObjectURL)/.test(body);
    if (!hasSideEffect) {
      toastOnlyFindings.push(`${rel(file)}:${i + 1}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Guard 2: Forbidden hardcoded literals outside approved fixtures
// ---------------------------------------------------------------------------
const FIXTURE_ALLOWLIST = new Set([
  'src/services/seedData.ts',
  'src/utils/algerianWilayas.ts',
  'src/config/localStorageRegistry.ts',
]);
const FORBIDDEN_PATTERNS = [
  { name: 'acc_01 fallback/literal', regex: /['"`]acc_01['"`]/g },
  { name: 'hardcoded staging supabase host', regex: /tzzncsbvezywtaknwind\.supabase\.co/g },
  { name: 'unsplash demo avatar/artwork url', regex: /images\.unsplash\.com\/photo-/g },
  { name: 'demo NIF fiscal identifier', regex: /001916010044589/g },
  { name: 'demo RC registration identifier', regex: /16\/00-0988421/g },
  { name: 'demo Carte Fellah identifier', regex: /CAW-16-09418/g },
  { name: 'hardcoded PM staff fallback id', regex: /['"`]stf_pm_01['"`]/g },
  { name: 'hardcoded PM lead fallback id', regex: /['"`]crea_lead_01['"`]/g },
  { name: 'hardcoded salon member fallback id', regex: /['"`]mem_salon_/g },
  { name: 'hardcoded salon staff fallback id', regex: /['"`]stf_salon_01['"`]/g },
  { name: 'stale 58 wilayas reference', regex: /\b58\s*[Ww]ilayas?\b/g },
];
const literalFindings = [];
for (const file of tsxFiles) {
  const r = rel(file);
  if (FIXTURE_ALLOWLIST.has(r) || r.endsWith('Data.ts')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (const { name, regex } of FORBIDDEN_PATTERNS) {
    lines.forEach((ln, idx) => {
      regex.lastIndex = 0;
      if (regex.test(ln)) {
        literalFindings.push(`${r}:${idx + 1} [${name}]`);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Guard 3: localStorage key registry parity
// ---------------------------------------------------------------------------
const registryPath = path.join(SRC_ROOT, 'config/localStorageRegistry.ts');
const registryText = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
const registeredKeys = new Set();
for (const m of registryText.matchAll(/key:\s*['"`]([^'"`]+)['"`]/g)) {
  registeredKeys.add(m[1]);
}
const unregisteredStorageKeys = [];
for (const file of tsxFiles) {
  const r = rel(file);
  if (r === 'src/config/localStorageRegistry.ts') continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const m of content.matchAll(/localStorage\.(?:get|set|remove)Item\(\s*['"`]([^'"`]+)['"`]/g)) {
    const key = m[1];
    if (!registeredKeys.has(key)) {
      unregisteredStorageKeys.push(`${r} -> "${key}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Guard 4: i18n dictionary key parity (EN / FR / AR)
// ---------------------------------------------------------------------------
function loadLocaleKeys(lang) {
  const p = path.join(SRC_ROOT, 'utils/locales', `${lang}.json`);
  if (!fs.existsSync(p)) return new Set();
  return new Set(Object.keys(JSON.parse(fs.readFileSync(p, 'utf8'))));
}
const enKeys = loadLocaleKeys('en');
const frKeys = loadLocaleKeys('fr');
const arKeys = loadLocaleKeys('ar');
const i18nAsymmetry = [];
for (const k of enKeys) {
  if (!frKeys.has(k)) i18nAsymmetry.push(`missing in fr.json: ${k}`);
  if (!arKeys.has(k)) i18nAsymmetry.push(`missing in ar.json: ${k}`);
}
for (const k of frKeys) {
  if (!enKeys.has(k)) i18nAsymmetry.push(`extra in fr.json: ${k}`);
}
for (const k of arKeys) {
  if (!enKeys.has(k)) i18nAsymmetry.push(`extra in ar.json: ${k}`);
}

const totalViolations =
  toastOnlyFindings.length +
  literalFindings.length +
  unregisteredStorageKeys.length +
  i18nAsymmetry.length;

const baseline = fs.existsSync(BASELINE_PATH)
  ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).metrics || {}
  : {};

const currentMetrics = {
  showToastOnly: toastOnlyFindings.length,
  forbiddenLiterals: literalFindings.length,
  unregisteredStorageKeys: unregisteredStorageKeys.length,
  i18nAsymmetry: i18nAsymmetry.length,
};

const regressions = [];
for (const [metric, count] of Object.entries(currentMetrics)) {
  const allowed = typeof baseline[metric] === 'number' ? baseline[metric] : Infinity;
  if (count > allowed) {
    regressions.push(`${metric}: ${count} > baseline ${allowed}`);
  }
}

console.log(`=== Atrium Phase 1 CI Guards (${STRICT ? 'STRICT' : 'RATCHET'}) ===`);
console.log(`1. showToast-only handlers: ${toastOnlyFindings.length} (baseline: ${baseline.showToastOnly ?? 'n/a'})`);
toastOnlyFindings.slice(0, 30).forEach((f) => console.log(`   - ${f}`));
if (toastOnlyFindings.length > 30) console.log(`   ... +${toastOnlyFindings.length - 30} more`);

console.log(`2. Forbidden literals: ${literalFindings.length} (baseline: ${baseline.forbiddenLiterals ?? 'n/a'})`);
literalFindings.slice(0, 30).forEach((f) => console.log(`   - ${f}`));
if (literalFindings.length > 30) console.log(`   ... +${literalFindings.length - 30} more`);

console.log(`3. Unregistered localStorage keys: ${unregisteredStorageKeys.length} (baseline: ${baseline.unregisteredStorageKeys ?? 'n/a'})`);
unregisteredStorageKeys.forEach((f) => console.log(`   - ${f}`));

console.log(`4. EN/FR/AR i18n dictionary asymmetry: ${i18nAsymmetry.length} (baseline: ${baseline.i18nAsymmetry ?? 'n/a'})`);
i18nAsymmetry.slice(0, 20).forEach((f) => console.log(`   - ${f}`));
if (i18nAsymmetry.length > 20) console.log(`   ... +${i18nAsymmetry.length - 20} more`);

if (STRICT && totalViolations > 0) {
  console.error(`\nFAILED: ${totalViolations} Phase 1 guard violation(s) remain.`);
  process.exit(1);
}
if (!STRICT && regressions.length > 0) {
  console.error(`\nFAILED (RATCHET REGRESSION): ${regressions.join('; ')}`);
  process.exit(1);
}
console.log(`\nSummary: ${totalViolations} total finding(s) [${STRICT ? 'STRICT PASS' : 'RATCHET PASS'}].`);
