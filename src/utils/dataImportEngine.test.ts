import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import {
  IMPORT_ENTITY_SCHEMAS,
  buildFormulaSafeCsv,
  buildImportErrorsReportCsv,
  decodeImportBytes,
  detectCsvDelimiter,
  executeChunkedImportCommit,
  normalizeArabicIndicDigits,
  normalizeImportPhone,
  parseDelimitedCsv,
  parseImportDateToIso,
  parseImportFileBuffer,
  runImportDryRun,
  sanitizeCsvCell,
  suggestColumnMapping,
} from './dataImportEngine';

test('supports all 10 catalog import entity targets', () => {
  const keys = Object.keys(IMPORT_ENTITY_SCHEMAS).sort();
  assert.deepEqual(keys, [
    'clients',
    'members',
    'parcels',
    'patients',
    'products',
    'properties',
    'staff',
    'students',
    'suppliers',
    'vehicles',
  ]);
});

test('decodes UTF-8 BOM, Windows-1256 Arabic, and ISO-8859-1 French cleanly', () => {
  const utf8Bom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Nom;Prix\nCafé;120')]);
  const r1 = decodeImportBytes(utf8Bom, 'auto');
  assert.equal(r1.detectedEncoding, 'utf-8');
  assert.ok(r1.text.startsWith('Nom;Prix'));

  // ISO-8859-1 explicit "Café\n"
  const latin1 = new Uint8Array([0x43, 0x61, 0x66, 0xe9]);
  const r2 = decodeImportBytes(latin1, 'iso-8859-1');
  assert.equal(r2.text, 'Café');

  // Windows-1256 Arabic byte 0xD3 (س) 0xE1 (ل) 0xC7 (ا) 0xE3 (م)
  const win1256 = new Uint8Array([0xd3, 0xe1, 0xc7, 0xe3]);
  const r3 = decodeImportBytes(win1256, 'windows-1256');
  assert.equal(r3.text, 'سلام');
});

test('auto-detects comma and semicolon delimiters and parses quoted/malformed CSV safely', () => {
  const semiCsv = 'Nom;Téléphone;Prix\n"Amina, Z.";0550123456;2500\nKarim;0661223344;3000';
  assert.equal(detectCsvDelimiter(semiCsv), ';');
  const parsed = parseDelimitedCsv(semiCsv, ';');
  assert.equal(parsed.headers.length, 3);
  assert.equal(parsed.rows[0][0], 'Amina, Z.');

  // Unclosed quote recovers without crashing and logs warning
  const malformed = 'name,sku\n"Broken item,SKU-1';
  const bad = parseDelimitedCsv(malformed, ',');
  assert.equal(bad.rows.length, 1);
  assert.equal(bad.parseWarnings[0]?.errorCode, 'UNCLOSED_QUOTE');
});

test('normalizes Arabic-Indic digits, Excel serial dates, and Algerian phones', () => {
  assert.equal(normalizeArabicIndicDigits('٠٥٥٠١٢٣٤٥٦'), '0550123456');
  // Excel serial 46000 -> 2025-12-09 (accounting for 1900 leap bug)
  const iso = parseImportDateToIso(46000);
  assert.match(iso || '', /^2025-12-09$/);
  assert.equal(parseImportDateToIso('26/11/2026'), '2026-11-26');

  const ph = normalizeImportPhone('٠٥٥٠ ١١ ٢٢ ٣٣');
  assert.equal(ph.valid, true);
  assert.equal(ph.e164, '+213550112233');
});

test('parses binary XLSX workbook via fflate with sharedStrings and inline numbers', () => {
  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">
  <si><t>Product Name</t></si>
  <si><t>Huile Olive 1L</t></si>
</sst>`;
  const sheetXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Price</t></is></c></row>
    <row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>950</v></c></row>
  </sheetData>
</worksheet>`;

  const xlsxBytes = zipSync({
    'xl/sharedStrings.xml': strToU8(sharedStringsXml),
    'xl/worksheets/sheet1.xml': strToU8(sheetXml),
  });

  const parsed = parseImportFileBuffer({ fileName: 'catalog.xlsx', bytes: xlsxBytes });
  assert.equal(parsed.sourceFormat, 'xlsx');
  assert.deepEqual(parsed.headers, ['Product Name', 'Price']);
  assert.deepEqual(parsed.rows, [['Huile Olive 1L', '950']]);
});

test('auto-maps headers, detects row errors & handles skip/update/merge duplicate policies', () => {
  const headers = ['Désignation Article', 'SKU', 'Prix Vente', 'Stock Initial'];
  const mapping = suggestColumnMapping(headers, 'products');
  assert.equal(mapping['Désignation Article'], 'name');
  assert.equal(mapping['SKU'], 'sku');
  assert.equal(mapping['Prix Vente'], 'priceAmount');
  assert.equal(mapping['Stock Initial'], 'stockQuantity');

  const rows = [
    ['Café Arabica', 'CAF-01', '850', '20'], // matches existing SKU CAF-01
    ['', 'BAD-02', '-10', '5'],              // missing name + negative price
    ['Sucre Roux', 'SUC-03', '220', '15'],   // fresh insert
  ];
  const existing = [{ id: 'prod_1', name: 'Old', sku: 'CAF-01' }];

  const skipRun = runImportDryRun({
    entityType: 'products',
    headers,
    rows,
    columnMap: mapping,
    duplicatePolicy: 'skip',
    existingItems: existing,
  });
  assert.equal(skipRun.toSkip, 1);
  assert.equal(skipRun.toInsert, 1);
  assert.equal(skipRun.errorCount, 2);

  const mergeRun = runImportDryRun({
    entityType: 'products',
    headers,
    rows,
    columnMap: mapping,
    duplicatePolicy: 'merge',
    existingItems: existing,
  });
  assert.equal(mergeRun.toMerge, 1);
  assert.equal(mergeRun.toInsert, 1);
});

test('protects exported/error CSV cells against spreadsheet formula injection', () => {
  assert.equal(sanitizeCsvCell('=CMD|"/C calc"!A0'), `"'=CMD|""/C calc""!A0"`);
  assert.equal(sanitizeCsvCell('+1234'), "'+1234");
  assert.equal(sanitizeCsvCell('@SUM(A1:A2)'), "'@SUM(A1:A2)");

  const csv = buildFormulaSafeCsv(['Name', 'Note'], [['=HYPERLINK("http://evil")', '-100']]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes(`'=HYPERLINK`));
  assert.ok(csv.includes(`'-100`));

  const errCsv = buildImportErrorsReportCsv([
    {
      rowNumber: 4,
      column: 'name',
      errorCode: 'FORMULA_TEST',
      messageEn: 'Bad cell',
      messageFr: 'Cellule invalide',
      messageAr: 'خلية غير صالحة',
      rawValue: '=2+2',
    },
  ]);
  assert.ok(errCsv.includes("'=2+2"));
});

test('handles 50,000-row CSV parse, dry-run, chunked commit, and rolls back created IDs on chunk failure', () => {
  const lines = ['name,sku,priceAmount'];
  for (let i = 1; i <= 50_000; i++) {
    lines.push(`Item ${i},SKU-${i},${(i % 900) + 100}`);
  }
  const bigCsv = lines.join('\n');
  const parsed = parseDelimitedCsv(bigCsv, ',');
  assert.equal(parsed.rows.length, 50_000);

  const mapping = suggestColumnMapping(parsed.headers, 'products');
  const dry = runImportDryRun({
    entityType: 'products',
    headers: parsed.headers,
    rows: parsed.rows,
    columnMap: mapping,
    duplicatePolicy: 'skip',
  });
  assert.equal(dry.validRows, 50_000);
  assert.equal(dry.toInsert, 50_000);
  assert.equal(dry.errorCount, 0);

  const rolledBackBatches: string[] = [];
  const res = executeChunkedImportCommit({
    records: dry.normalizedRecords,
    chunkSize: 5000,
    rollbackOnFailure: true,
    applyChunk: (chunk, idx) => {
      if (idx === 3) return { ok: false, error: 'Simulated network constraint error on chunk 4' };
      return { ok: true, createdIds: chunk.map((c) => `id_${c.rowNumber}`) };
    },
    rollbackCreatedIds: (ids) => {
      rolledBackBatches.push(...ids);
    },
  });

  assert.equal(res.status, 'rolled_back');
  assert.equal(res.chunksTotal, 10);
  assert.equal(res.chunksCommitted, 0);
  assert.equal(rolledBackBatches.length, 15_000);
});
