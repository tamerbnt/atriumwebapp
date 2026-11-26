import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileWarning,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
  selectCurrentImportJobsFromState,
  selectCurrentImportMappingsFromState,
  selectExistingItemsForImportEntityFromState,
} from '../../../services/store';
import {
  IMPORT_ENTITY_SCHEMAS,
  buildImportErrorsReportCsv,
  buildSampleCsvForEntity,
  parseImportFileBuffer,
  runImportDryRun,
  suggestColumnMapping,
  type ParsedImportTable,
} from '../../../utils/dataImportEngine';
import type {
  ImportDelimiter,
  ImportDuplicatePolicy,
  ImportEncoding,
  ImportEntityType,
} from '../../../types/index';
import { t } from '../../../utils/i18n';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';

const ENTITY_ORDER: ImportEntityType[] = [
  'members',
  'clients',
  'products',
  'suppliers',
  'staff',
  'patients',
  'vehicles',
  'parcels',
  'properties',
  'students',
];

function triggerCsvDownload(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const DataImportWorkspace: React.FC = () => {
  const { language, mappings, jobs, existingByEntity } = useAtriumSelector(
    (s) => ({
      language: s.language,
      mappings: selectCurrentImportMappingsFromState(s),
      jobs: selectCurrentImportJobsFromState(s),
      existingByEntity: {
        members: selectExistingItemsForImportEntityFromState(s, 'members'),
        clients: selectExistingItemsForImportEntityFromState(s, 'clients'),
        patients: selectExistingItemsForImportEntityFromState(s, 'patients'),
        products: selectExistingItemsForImportEntityFromState(s, 'products'),
        suppliers: selectExistingItemsForImportEntityFromState(s, 'suppliers'),
        staff: selectExistingItemsForImportEntityFromState(s, 'staff'),
        vehicles: selectExistingItemsForImportEntityFromState(s, 'vehicles'),
        parcels: selectExistingItemsForImportEntityFromState(s, 'parcels'),
        properties: selectExistingItemsForImportEntityFromState(s, 'properties'),
        students: selectExistingItemsForImportEntityFromState(s, 'students'),
      },
    }),
    shallowEqualObjects
  );

  const {
    saveImportColumnMapping,
    deleteImportColumnMapping,
    commitDataImportBatch,
    rollbackDataImportJob,
  } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Source & Config
  const [entityType, setEntityType] = useState<ImportEntityType>('products');
  const [encoding, setEncoding] = useState<ImportEncoding>('auto');
  const [delimiter, setDelimiter] = useState<ImportDelimiter>('auto');
  const [duplicatePolicy, setDuplicatePolicy] = useState<ImportDuplicatePolicy>('skip');
  const [chunkSize, setChunkSize] = useState<number>(500);

  // Parsed table + raw bytes (for re-decoding if encoding/delimiter changes)
  const [rawBytes, setRawBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedTable, setParsedTable] = useState<ParsedImportTable | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [selectedMappingId, setSelectedMappingId] = useState<string>('');
  const [templateNameInput, setTemplateNameInput] = useState<string>('');

  // Optional raw paste input
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');

  const schema = IMPORT_ENTITY_SCHEMAS[entityType];
  const entityMappings = useMemo(
    () => mappings.filter((m) => m.entityType === entityType),
    [mappings, entityType]
  );
  const existingItems = existingByEntity[entityType] || [];

  const applyParsedBuffer = (
    name: string,
    bytes: Uint8Array,
    nextEntity: ImportEntityType,
    nextEncoding: ImportEncoding,
    nextDelimiter: ImportDelimiter
  ) => {
    const table = parseImportFileBuffer({
      fileName: name,
      bytes,
      encoding: nextEncoding,
      delimiter: nextDelimiter,
    });
    setRawBytes(bytes);
    setFileName(name);
    setParsedTable(table);
    setColumnMap(suggestColumnMapping(table.headers, nextEntity));
    setSelectedMappingId('');
  };

  const handleEntityChange = (nextEntity: ImportEntityType) => {
    setEntityType(nextEntity);
    setSelectedMappingId('');
    if (parsedTable) {
      setColumnMap(suggestColumnMapping(parsedTable.headers, nextEntity));
    }
  };

  const handleEncodingChange = (nextEncoding: ImportEncoding) => {
    setEncoding(nextEncoding);
    if (rawBytes && fileName) {
      const table = parseImportFileBuffer({
        fileName,
        bytes: rawBytes,
        encoding: nextEncoding,
        delimiter,
      });
      setParsedTable(table);
      setColumnMap(suggestColumnMapping(table.headers, entityType));
    }
  };

  const handleDelimiterChange = (nextDelimiter: ImportDelimiter) => {
    setDelimiter(nextDelimiter);
    if (rawBytes && fileName) {
      const table = parseImportFileBuffer({
        fileName,
        bytes: rawBytes,
        encoding,
        delimiter: nextDelimiter,
      });
      setParsedTable(table);
      setColumnMap(suggestColumnMapping(table.headers, entityType));
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    applyParsedBuffer(file.name, bytes, entityType, encoding, delimiter);
    e.target.value = '';
  };

  const handleLoadSampleData = () => {
    const sampleCsv = buildSampleCsvForEntity(entityType);
    const bytes = new TextEncoder().encode(sampleCsv);
    applyParsedBuffer(`sample_${entityType}.csv`, bytes, entityType, encoding, delimiter);
    showToast({
      type: 'info',
      title: L('Sample Data Loaded', 'Exemple chargé', 'تم تحميل البيانات النموذجية'),
      message: `sample_${entityType}.csv`,
    });
  };

  const handleParsePasted = () => {
    if (!pasteText.trim()) return;
    const bytes = new TextEncoder().encode(pasteText);
    applyParsedBuffer(`pasted_${entityType}.csv`, bytes, entityType, encoding, delimiter);
    setShowPasteBox(false);
  };

  const handleApplySavedTemplate = (mappingId: string) => {
    setSelectedMappingId(mappingId);
    const found = entityMappings.find((m) => m.id === mappingId);
    if (!found) return;
    setColumnMap({ ...found.columnMap });
    if (found.duplicatePolicy) setDuplicatePolicy(found.duplicatePolicy);
  };

  const handleSaveTemplate = () => {
    const name = templateNameInput.trim();
    if (!name || !parsedTable) return;
    const saved = saveImportColumnMapping({
      entityType,
      templateName: name,
      encoding,
      delimiter,
      duplicatePolicy,
      columnMap,
    });
    setSelectedMappingId(saved.id);
    setTemplateNameInput('');
    showToast({
      type: 'success',
      title: L('Template Saved', 'Modèle enregistré', 'تم حفظ القالب'),
      message: saved.templateName,
    });
  };

  const missingRequiredFields = useMemo(() => {
    const mappedValues = new Set(Object.values(columnMap).filter(Boolean));
    return schema.fields.filter((f) => f.required && !mappedValues.has(f.key));
  }, [schema.fields, columnMap]);

  const dryRun = useMemo(() => {
    if (!parsedTable || parsedTable.headers.length === 0) return null;
    return runImportDryRun({
      entityType,
      headers: parsedTable.headers,
      rows: parsedTable.rows,
      columnMap,
      duplicatePolicy,
      existingItems,
    });
  }, [parsedTable, entityType, columnMap, duplicatePolicy, existingItems]);

  const handleCommitImport = () => {
    if (!parsedTable || !dryRun) return;
    const job = commitDataImportBatch({
      entityType,
      fileName: fileName || `${entityType}.csv`,
      encoding: parsedTable.detectedEncoding,
      delimiter: parsedTable.detectedDelimiter,
      duplicatePolicy,
      mappingId: selectedMappingId || undefined,
      headers: parsedTable.headers,
      rows: parsedTable.rows,
      columnMap,
      chunkSize,
    });
    showToast({
      type: job.status === 'committed' ? 'success' : 'error',
      title:
        job.status === 'committed'
          ? L('Import Committed', 'Importation réussie', 'تم الاستيراد بنجاح')
          : L('Import Rolled Back', 'Importation annulée', 'تم التراجع عن الاستيراد'),
      message: `${job.insertedRows + job.updatedRows + job.mergedRows} / ${job.totalRows} ${L('rows applied', 'lignes appliquées', 'صف مطبّق')}`,
    });
  };

  const getFieldLabel = (field: (typeof schema.fields)[number]) =>
    isAr ? field.labelAr : isEn ? field.labelEn : field.labelFr;

  const getEntityLabel = (et: ImportEntityType) => {
    const sc = IMPORT_ENTITY_SCHEMAS[et];
    return isAr ? sc.labelAr : isEn ? sc.labelEn : sc.labelFr;
  };

  const previewRows = useMemo(() => (parsedTable?.rows || []).slice(0, 25), [parsedTable]);

  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)]">
      {/* Header Banner */}
      <div className="sq-elev-card">
        <div
          data-sq="panel"
          className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--card-gap,12px)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]">
            <div className="flex items-center gap-[var(--card-head-gap,12px)]">
              <div
                data-sq="tile"
                data-sq-border="none"
                style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
                className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
              >
                <FileSpreadsheet size={20} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[var(--s1,4px)]">
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_import_title', language)}
                </h3>
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  {t('phase2_import_subtitle', language)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
              <Button
                type="button"
                tone="soft"
                size={36}
                onClick={() => {
                  const csv = buildSampleCsvForEntity(entityType);
                  triggerCsvDownload(`atrium_template_${entityType}.csv`, csv);
                }}
              >
                <Download size={14} strokeWidth={1.5} />
                <span>{t('phase2_import_download_sample', language)}</span>
              </Button>
              <Button
                type="button"
                tone="soft"
                size={36}
                onClick={handleLoadSampleData}
              >
                <Sparkles size={14} strokeWidth={1.5} />
                <span>{t('phase2_import_load_sample', language)}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Target Entity & File Upload */}
      <div className="sq-elev-card">
        <div
          data-sq="panel"
          className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--card-gap,12px)]"
        >
          <div className="flex items-center justify-between gap-[var(--s2,8px)]">
            <h4 className="t-card text-[var(--text-1)] dark:text-white">
              {t('phase2_import_step_1', language)}
            </h4>
            <span className="t-cap text-[var(--text-2)] tabular-nums">
              {L('Existing records:', 'Enregistrements existants :', 'السجلات الحالية:')}{' '}
              <strong className="text-[var(--text-1)] dark:text-white">{existingItems.length}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--card-gap,12px)]">
            <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <label htmlFor="import-entity-select" className="t-cap font-semibold text-[var(--text-2)]">
                {t('phase2_import_entity_label', language)}
              </label>
              <select
                id="import-entity-select"
                value={entityType}
                onChange={(e) => handleEntityChange(e.target.value as ImportEntityType)}
                className="h-[38px] px-[var(--s2,8px)] rounded-[8px] border border-[var(--atr-border)] bg-transparent text-[var(--text-1)] dark:text-white t-small"
              >
                {ENTITY_ORDER.map((et) => (
                  <option key={et} value={et} className="bg-white dark:bg-[#22201E]">
                    {getEntityLabel(et)}
                  </option>
                ))}
              </select>
            </div>

            <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <label htmlFor="import-encoding-select" className="t-cap font-semibold text-[var(--text-2)]">
                {t('phase2_import_encoding_label', language)}
              </label>
              <select
                id="import-encoding-select"
                value={encoding}
                onChange={(e) => handleEncodingChange(e.target.value as ImportEncoding)}
                className="h-[38px] px-[var(--s2,8px)] rounded-[8px] border border-[var(--atr-border)] bg-transparent text-[var(--text-1)] dark:text-white t-small"
              >
                <option value="auto" className="bg-white dark:bg-[#22201E]">Auto (UTF-8 / Win-1256 / Latin1)</option>
                <option value="utf-8" className="bg-white dark:bg-[#22201E]">UTF-8</option>
                <option value="utf-16le" className="bg-white dark:bg-[#22201E]">UTF-16LE (Excel Unicode)</option>
                <option value="windows-1256" className="bg-white dark:bg-[#22201E]">Windows-1256 (Arabic)</option>
                <option value="iso-8859-1" className="bg-white dark:bg-[#22201E]">ISO-8859-1 (French Latin)</option>
              </select>
            </div>

            <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <label htmlFor="import-delimiter-select" className="t-cap font-semibold text-[var(--text-2)]">
                {t('phase2_import_delimiter_label', language)}
              </label>
              <select
                id="import-delimiter-select"
                value={delimiter}
                onChange={(e) => handleDelimiterChange(e.target.value as ImportDelimiter)}
                className="h-[38px] px-[var(--s2,8px)] rounded-[8px] border border-[var(--atr-border)] bg-transparent text-[var(--text-1)] dark:text-white t-small"
              >
                <option value="auto" className="bg-white dark:bg-[#22201E]">Auto (, / ; / Tab)</option>
                <option value=";" className="bg-white dark:bg-[#22201E]">Semicolon (;)</option>
                <option value="," className="bg-white dark:bg-[#22201E]">Comma (,)</option>
                <option value={'\t'} className="bg-white dark:bg-[#22201E]">Tab (\t)</option>
              </select>
            </div>

            <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]">
              <label htmlFor="import-dup-policy-select" className="t-cap font-semibold text-[var(--text-2)]">
                {t('phase2_import_dup_policy_label', language)}
              </label>
              <select
                id="import-dup-policy-select"
                value={duplicatePolicy}
                onChange={(e) => setDuplicatePolicy(e.target.value as ImportDuplicatePolicy)}
                className="h-[38px] px-[var(--s2,8px)] rounded-[8px] border border-[var(--atr-border)] bg-transparent text-[var(--text-1)] dark:text-white t-small"
              >
                <option value="skip" className="bg-white dark:bg-[#22201E]">
                  {L('Skip duplicates', 'Ignorer doublons', 'تخطي المكرر')}
                </option>
                <option value="update" className="bg-white dark:bg-[#22201E]">
                  {L('Update matching records', 'Mettre à jour', 'تحديث السجلات المطابقة')}
                </option>
                <option value="merge" className="bg-white dark:bg-[#22201E]">
                  {L('Merge non-empty fields', 'Fusionner champs', 'دمج الحقول غير الفارغة')}
                </option>
              </select>
            </div>
          </div>

          {/* File Drop / Pick Bar */}
          <div
            data-sq="card"
            className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
          >
            <div className="flex items-center gap-[var(--s3,12px)]">
              <div
                data-sq="ctl-sm"
                className="w-[38px] h-[38px] bg-[#F3EDE7] dark:bg-[#2B2825] flex items-center justify-center shrink-0 text-[var(--brand-text)]"
              >
                <Upload size={18} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[2px]">
                <span className="t-label font-semibold text-[var(--text-1)] dark:text-white">
                  {fileName || t('phase2_import_upload_file', language)}
                </span>
                <span className="t-cap text-[var(--text-2)] tabular-nums">
                  {parsedTable
                    ? `${parsedTable.sourceFormat.toUpperCase()} · ${parsedTable.detectedEncoding.toUpperCase()} · ${parsedTable.rows.length} ${L('rows', 'lignes', 'صفوف')}`
                    : L('Supports 50k+ CSV rows, OOXML .xlsx, and Excel XML', 'Supporte +50k lignes CSV, .xlsx et XML', 'يدعم +50 ألف صف CSV وملفات .xlsx وXML')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xml,.txt"
                onChange={handleFileSelected}
                className="hidden"
                aria-label={t('phase2_import_upload_file', language)}
              />
              <Button
                type="button"
                tone="soft"
                size={36}
                onClick={() => setShowPasteBox((v) => !v)}
              >
                <span>{showPasteBox ? L('Hide Paste', 'Masquer texte', 'إخفاء اللصق') : L('Paste CSV / Excel', 'Coller CSV / Excel', 'لصق CSV')}</span>
              </Button>
              <AtriumButton
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} strokeWidth={1.5} />
                <span>{t('phase2_import_upload_file', language)}</span>
              </AtriumButton>
            </div>
          </div>

          {showPasteBox && (
            <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s2,8px)]">
              <label htmlFor="import-paste-textarea" className="t-cap font-semibold text-[var(--text-2)]">
                {L('Paste spreadsheet rows (tab or CSV/semicolon separated)', 'Coller les lignes CSV / Excel', 'ألصق صفوف الجدول هنا')}
              </label>
              <textarea
                id="import-paste-textarea"
                rows={4}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'name,priceAmount,stockQuantity\nWhey Isolate,12500,15'}
                className="w-full p-[var(--s2,8px)] rounded-[8px] border border-[var(--atr-border)] bg-transparent text-[var(--text-1)] dark:text-white t-small font-mono"
              />
              <div className="flex justify-end">
                <AtriumButton type="button" size="sm" onClick={handleParsePasted}>
                  <Play size={14} strokeWidth={1.5} />
                  <span>{L('Parse Pasted Data', 'Analyser le texte', 'تحليل النص')}</span>
                </AtriumButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 & Step 3 & Step 4: Shown when a file/sample is loaded */}
      {parsedTable && (
        <>
          {/* Step 2: Column Mapping & Saved Templates */}
          <div className="sq-elev-card">
            <div
              data-sq="panel"
              className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--card-gap,12px)]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]">
                <h4 className="t-card text-[var(--text-1)] dark:text-white">
                  {t('phase2_import_step_2', language)}
                </h4>

                <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
                  {entityMappings.length > 0 && (
                    <div className="flex items-center gap-[var(--s1,4px)]">
                      <select
                        aria-label={L('Saved mapping templates', 'Modèles enregistrés', 'القوالب المحفوظة')}
                        value={selectedMappingId}
                        onChange={(e) => handleApplySavedTemplate(e.target.value)}
                        className="h-[34px] px-[var(--s2,8px)] rounded-[8px] border border-[var(--atr-border)] bg-white dark:bg-[#22201E] text-[var(--text-1)] dark:text-white t-small"
                      >
                        <option value="">{L('Saved templates...', 'Modèles enregistrés...', 'اختر قالباً...')}</option>
                        {entityMappings.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.templateName}
                          </option>
                        ))}
                      </select>
                      {selectedMappingId && (
                        <button
                          type="button"
                          onClick={() => {
                            deleteImportColumnMapping(selectedMappingId);
                            setSelectedMappingId('');
                          }}
                          aria-label={L('Delete selected template', 'Supprimer modèle', 'حذف القالب')}
                          className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  )}

                  <Button
                    type="button"
                    tone="soft"
                    size={34}
                    onClick={() => setColumnMap(suggestColumnMapping(parsedTable.headers, entityType))}
                  >
                    <Sparkles size={14} strokeWidth={1.5} />
                    <span>{L('Auto-Map', 'Mappage auto', 'ربط تلقائي')}</span>
                  </Button>
                </div>
              </div>

              {missingRequiredFields.length > 0 && (
                <div
                  data-sq="card"
                  style={{ '--sq-stroke': 'rgba(245,158,11,0.5)' } as React.CSSProperties}
                  className="p-[var(--s3,12px)] bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 t-small flex items-center gap-[var(--s2,8px)]"
                >
                  <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0" />
                  <span>
                    {L('Unmapped required fields:', 'Champs obligatoires non mappés :', 'حقول إجبارية غير مربوطة:')}{' '}
                    {missingRequiredFields.map(getFieldLabel).join(', ')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--s2,8px)]">
                {parsedTable.headers.map((header) => (
                  <div
                    key={header}
                    data-sq="card"
                    className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]"
                  >
                    <label
                      htmlFor={`map-col-${header}`}
                      className="t-cap font-semibold text-[var(--text-1)] dark:text-white truncate"
                      title={header}
                    >
                      {header}
                    </label>
                    <select
                      id={`map-col-${header}`}
                      value={columnMap[header] || ''}
                      onChange={(e) =>
                        setColumnMap((prev) => ({ ...prev, [header]: e.target.value }))
                      }
                      className="h-[34px] px-[var(--s2,8px)] rounded-[8px] border border-[var(--atr-border)] bg-transparent text-[var(--text-1)] dark:text-white t-small"
                    >
                      <option value="" className="bg-white dark:bg-[#22201E]">
                        {L('-- Ignore Column --', '-- Ignorer --', '-- تجاهل العمود --')}
                      </option>
                      {schema.fields.map((f) => (
                        <option key={f.key} value={f.key} className="bg-white dark:bg-[#22201E]">
                          {getFieldLabel(f)}
                          {f.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Save Template Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-[var(--s2,8px)] pt-[var(--s1,4px)]">
                <input
                  type="text"
                  aria-label={L('Template name', 'Nom du modèle', 'اسم القالب')}
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder={L('New template name (e.g. Supplier Excel)...', 'Nom du modèle...', 'اسم القالب الجديد...')}
                  className="flex-1 h-[36px] px-[var(--s3,12px)] rounded-[8px] border border-[var(--atr-border)] bg-white dark:bg-[#22201E] text-[var(--text-1)] dark:text-white t-small"
                />
                <Button
                  type="button"
                  tone="soft"
                  size={36}
                  disabled={!templateNameInput.trim()}
                  onClick={handleSaveTemplate}
                >
                  <Save size={14} strokeWidth={1.5} />
                  <span>{L('Save Mapping Template', 'Enregistrer le modèle', 'حفظ قالب الربط')}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Step 3: Validation Preview (First 25 Rows) */}
          <div className="sq-elev-card">
            <div
              data-sq="panel"
              className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--card-gap,12px)]"
            >
              <div className="flex items-center justify-between">
                <h4 className="t-card text-[var(--text-1)] dark:text-white">
                  {t('phase2_import_step_3', language)}
                </h4>
                <span className="t-cap text-[var(--text-2)] tabular-nums">
                  {L(`Showing ${previewRows.length} of ${parsedTable.rows.length}`, `Aperçu ${previewRows.length} / ${parsedTable.rows.length}`, `عرض ${previewRows.length} من ${parsedTable.rows.length}`)}
                </span>
              </div>

              <div data-sq="card" className="bg-white dark:bg-[#22201E] overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--atr-divider)]">
                      <th className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-cap font-semibold text-[var(--text-2)] text-start">#</th>
                      {parsedTable.headers.map((h) => (
                        <th key={h} className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-cap font-semibold text-[var(--text-2)] text-start whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-[var(--atr-divider)] last:border-b-0">
                        <td className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-cap text-[var(--text-2)] tabular-nums">
                          {rIdx + 1}
                        </td>
                        {parsedTable.headers.map((_, cIdx) => (
                          <td key={cIdx} className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-small text-[var(--text-1)] dark:text-white whitespace-nowrap">
                            {row[cIdx] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Step 4: Dry Run Summary, Error Inspector & Chunked Commit */}
          {dryRun && (
            <div className="sq-elev-card">
              <div
                data-sq="panel"
                className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--card-gap,12px)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s2,8px)]">
                  <h4 className="t-card text-[var(--text-1)] dark:text-white">
                    {t('phase2_import_step_4', language)}
                  </h4>

                  {dryRun.errorCount > 0 && (
                    <Button
                      type="button"
                      tone="soft"
                      size={34}
                      onClick={() =>
                        triggerCsvDownload(
                          `import_errors_${entityType}.csv`,
                          buildImportErrorsReportCsv(dryRun.errors)
                        )
                      }
                    >
                      <Download size={14} strokeWidth={1.5} />
                      <span>{t('phase2_import_export_errors', language)}</span>
                    </Button>
                  )}
                </div>

                {/* Dry-Run KPI Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-[var(--s2,8px)]">
                  <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E]">
                    <div className="t-cap text-[var(--text-2)]">{L('To Insert', 'À créer', 'للإدخال')}</div>
                    <div className="t-pod text-emerald-700 dark:text-emerald-400 tabular-nums">{dryRun.toInsert}</div>
                  </div>
                  <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E]">
                    <div className="t-cap text-[var(--text-2)]">{L('To Update', 'À maj', 'للتحديث')}</div>
                    <div className="t-pod text-sky-700 dark:text-sky-400 tabular-nums">{dryRun.toUpdate}</div>
                  </div>
                  <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E]">
                    <div className="t-cap text-[var(--text-2)]">{L('To Merge', 'À fusionner', 'للدمج')}</div>
                    <div className="t-pod text-indigo-700 dark:text-indigo-400 tabular-nums">{dryRun.toMerge}</div>
                  </div>
                  <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E]">
                    <div className="t-cap text-[var(--text-2)]">{L('Skipped Dupes', 'Doublons ignorés', 'مكررات متخطاة')}</div>
                    <div className="t-pod text-[var(--text-2)] tabular-nums">{dryRun.toSkip}</div>
                  </div>
                  <div data-sq="card" className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] col-span-2 sm:col-span-1">
                    <div className="t-cap text-[var(--text-2)]">{L('Row Errors', 'Erreurs', 'أخطاء الصفوف')}</div>
                    <div className={`t-pod tabular-nums ${dryRun.errorCount > 0 ? 'text-rose-600' : 'text-[var(--text-1)] dark:text-white'}`}>
                      {dryRun.errorCount}
                    </div>
                  </div>
                </div>

                {/* Row-Level Error Table */}
                {dryRun.errors.length > 0 && (
                  <div data-sq="card" className="bg-white dark:bg-[#22201E] max-h-[240px] overflow-auto">
                    <table className="w-full text-start border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--atr-divider)]">
                          <th className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-cap font-semibold text-[var(--text-2)] text-start">{L('Row', 'Ligne', 'الصف')}</th>
                          <th className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-cap font-semibold text-[var(--text-2)] text-start">{L('Column', 'Colonne', 'العمود')}</th>
                          <th className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-cap font-semibold text-[var(--text-2)] text-start">{L('Error', 'Erreur', 'الخطأ')}</th>
                          <th className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-cap font-semibold text-[var(--text-2)] text-start">{L('Raw Value', 'Valeur', 'القيمة')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dryRun.errors.slice(0, 100).map((err, idx) => (
                          <tr key={idx} className="border-b border-[var(--atr-divider)] last:border-b-0">
                            <td className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-small tabular-nums font-semibold text-rose-600">
                              #{err.rowNumber}
                            </td>
                            <td className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-small text-[var(--text-1)] dark:text-white">
                              {err.column || '—'}
                            </td>
                            <td className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-small text-rose-700 dark:text-rose-300">
                              {isAr ? err.messageAr : isEn ? err.messageEn : err.messageFr}
                            </td>
                            <td className="py-[var(--s2,8px)] px-[var(--s3,12px)] t-cap text-[var(--text-2)] font-mono">
                              {err.rawValue || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Commit Controls */}
                <div
                  data-sq="card"
                  className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
                >
                  <div className="flex items-center gap-[var(--s3,12px)]">
                    <label htmlFor="import-chunk-size" className="t-small font-semibold text-[var(--text-2)]">
                      {L('Batch Chunk Size:', 'Taille de lot :', 'حجم الدفعة:')}
                    </label>
                    <select
                      id="import-chunk-size"
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Number(e.target.value))}
                      className="h-[34px] px-[var(--s2,8px)] rounded-[8px] border border-[var(--atr-border)] bg-transparent text-[var(--text-1)] dark:text-white t-small tabular-nums"
                    >
                      <option value={100} className="bg-white dark:bg-[#22201E]">100 rows / chunk</option>
                      <option value={250} className="bg-white dark:bg-[#22201E]">250 rows / chunk</option>
                      <option value={500} className="bg-white dark:bg-[#22201E]">500 rows / chunk</option>
                      <option value={1000} className="bg-white dark:bg-[#22201E]">1000 rows / chunk</option>
                    </select>
                  </div>

                  <AtriumButton
                    type="button"
                    size="md"
                    disabled={dryRun.toInsert + dryRun.toUpdate + dryRun.toMerge === 0}
                    onClick={handleCommitImport}
                  >
                    <CheckCircle2 size={16} strokeWidth={1.5} />
                    <span>
                      {t('phase2_import_commit_btn', language)} ({dryRun.toInsert + dryRun.toUpdate + dryRun.toMerge})
                    </span>
                  </AtriumButton>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 5: Job History & Rollback */}
      <div className="sq-elev-card">
        <div
          data-sq="panel"
          className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--card-gap,12px)]"
        >
          <div className="flex items-center justify-between">
            <h4 className="t-card text-[var(--text-1)] dark:text-white">
              {t('phase2_import_step_5', language)}
            </h4>
            <span className="t-cap text-[var(--text-2)] tabular-nums">
              {jobs.length} {L('jobs', 'imports', 'عمليات')}
            </span>
          </div>

          {jobs.length === 0 ? (
            <div data-sq="card" className="p-[var(--card-pad,20px)] bg-white dark:bg-[#22201E] flex items-center gap-[var(--s3,12px)] text-[var(--text-2)] t-small">
              <Database size={18} strokeWidth={1.5} className="shrink-0" />
              <span>
                {L(
                  'No imports executed yet for this business. Load sample data or upload a spreadsheet above.',
                  'Aucune importation exécutée pour cette entité.',
                  'لم يتم تنفيذ أي استيراد بعد لهذه المؤسسة.'
                )}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-[var(--s2,8px)]">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  data-sq="card"
                  className="p-[var(--card-pad,16px)] bg-white dark:bg-[#22201E] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
                >
                  <div className="flex flex-col gap-[4px]">
                    <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
                      <span className="t-label font-semibold text-[var(--text-1)] dark:text-white">
                        {job.fileName}
                      </span>
                      <span className="px-[8px] h-[22px] inline-flex items-center rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] t-cap font-semibold text-[var(--text-1)] dark:text-white">
                        {getEntityLabel(job.entityType)}
                      </span>
                      <span
                        className={`px-[8px] h-[22px] inline-flex items-center rounded-full t-cap font-semibold ${
                          job.status === 'committed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : job.status === 'rolled_back'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="t-cap text-[var(--text-2)] tabular-nums">
                      +{job.insertedRows} {L('inserted', 'créés', 'مضاف')} · ~{job.updatedRows}{' '}
                      {L('updated', 'maj', 'محدّث')} · ={job.mergedRows}{' '}
                      {L('merged', 'fusionnés', 'مدمج')} · {job.skippedRows}{' '}
                      {L('skipped', 'ignorés', 'متخطى')} · {job.errorRows}{' '}
                      {L('errors', 'erreurs', 'أخطاء')}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
                    {job.errorSummary && job.errorSummary.length > 0 && (
                      <Button
                        type="button"
                        tone="soft"
                        size={32}
                        onClick={() =>
                          triggerCsvDownload(
                            `job_errors_${job.id.slice(0, 8)}.csv`,
                            buildImportErrorsReportCsv(job.errorSummary)
                          )
                        }
                      >
                        <FileWarning size={14} strokeWidth={1.5} />
                        <span>{t('phase2_import_export_errors', language)}</span>
                      </Button>
                    )}

                    {job.status === 'committed' && (
                      <Button
                        type="button"
                        tone="soft"
                        size={32}
                        onClick={() => rollbackDataImportJob(job.id, 'UI rollback')}
                      >
                        <RotateCcw size={14} strokeWidth={1.5} />
                        <span>{t('phase2_import_rollback_btn', language)}</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
