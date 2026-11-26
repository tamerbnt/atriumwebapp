import type {
  StaffAttendanceLogRecord,
  StaffMember,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
  StaffSalaryAdvance,
} from '../types/index';

export const LEGACY_PAYROLL_STORAGE_KEYS = [
  'atrium_staff_attendance_logs_v1',
  'atrium_staff_salary_advances_v1',
  'atrium_staff_payroll_runs_v1',
  'atrium_staff_payroll_slips_v1',
  'atrium_erp_desktop_v2',
] as const;

export type LegacyPayrollStorageKey = (typeof LEGACY_PAYROLL_STORAGE_KEYS)[number];
export type PayrollEntityKind = 'attendance' | 'advance' | 'payroll_run' | 'payroll_slip';

export interface PayrollUuidMappingEntry {
  entityKind: PayrollEntityKind;
  legacyId: string;
  mappedUuid: string;
  alreadyUuid: boolean;
  label: string;
  sourceKey: LegacyPayrollStorageKey;
}

export interface PayrollFieldDiffItem {
  entityKind: PayrollEntityKind;
  legacyId: string;
  mappedUuid: string;
  label: string;
  differences: Array<{
    field: string;
    localValue: unknown;
    remoteValue: unknown;
  }>;
}

export interface PayrollPeriodCollision {
  collisionKey: string;
  businessId: string;
  branchId: string;
  periodYear: number;
  periodMonth: number;
  runType: string;
  adjustmentSeq: number;
  sources: Array<{
    source: 'legacy_cache' | 'store_remote';
    runId: string;
    title: string;
    status: string;
  }>;
}

export interface MissingDisbursementAccountWarning {
  source: 'staff' | 'payroll_slip';
  entityId: string;
  staffName: string;
  paymentMethod: string;
  missingFields: Array<'ccpNumber' | 'ccpKey' | 'bankRib'>;
}

export interface PayrollDryRunEntitySummary {
  entityKind: PayrollEntityKind;
  legacyTotalCount: number;
  newToRemoteCount: number;
  matchedRemoteCount: number;
  fieldDiffCount: number;
  remoteTotalCount: number;
}

export interface PayrollDryRunReport {
  generatedAt: string;
  isReadOnlyDryRun: true;
  dbWritesExecuted: 0;
  gateStatus: 'AWAITING_GATE_4_APPROVAL';
  statutoryBasisBadge: 'Rates not verified (legacy basis)';
  businessId: string;
  branchId: string;
  scannedKeys: Array<{
    key: LegacyPayrollStorageKey;
    present: boolean;
    recordCount: number;
  }>;
  entitySummaries: PayrollDryRunEntitySummary[];
  uuidMappings: PayrollUuidMappingEntry[];
  fieldDiffs: PayrollFieldDiffItem[];
  periodCollisions: PayrollPeriodCollision[];
  missingAccountWarnings: MissingDisbursementAccountWarning[];
  hasBlockersOrWarnings: boolean;
}

export interface PayrollDryRunRemoteState {
  businessId: string;
  branchId: string;
  staffList: StaffMember[];
  attendanceLogs: StaffAttendanceLogRecord[];
  salaryAdvances: StaffSalaryAdvance[];
  payrollRuns: StaffPayrollRunRecord[];
  payrollSlips: StaffPayrollSlipRecord[];
}

export type StorageReader = (key: LegacyPayrollStorageKey) => string | null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuidFormat(id?: string | null): boolean {
  return Boolean(id && UUID_REGEX.test(id));
}

/**
 * Pure deterministic UUID mapper matching `toValidUuid` in src/lib/supabase/client.ts
 * so Step 7a preview IDs match Step 7b write targets identically.
 */
export function deterministicLegacyUuid(
  id?: string | null,
  fallbackSeed = '00000000-0000-4000-8000-000000000001'
): string {
  if (id && isValidUuidFormat(id)) return id;
  if (!id) return fallbackSeed;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-${hex.slice(0, 4)}-4000-8000-${hex.padEnd(12, '0').slice(0, 12)}`;
}

function defaultStorageReader(key: LegacyPayrollStorageKey): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeParseJson<T = unknown>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

function compareScalarField(
  field: string,
  localValue: unknown,
  remoteValue: unknown
): { field: string; localValue: unknown; remoteValue: unknown } | null {
  const normLocal = localValue ?? null;
  const normRemote = remoteValue ?? null;
  if (normLocal === normRemote) return null;
  if (JSON.stringify(normLocal) === JSON.stringify(normRemote)) return null;
  return { field, localValue: normLocal, remoteValue: normRemote };
}

function collectScopedLegacyRecords<T extends { id?: string; businessId?: string; branchId?: string }>(
  primaryKey: LegacyPayrollStorageKey,
  desktopField: keyof Record<string, unknown>,
  reader: StorageReader,
  businessId: string,
  branchId: string
): {
  records: Array<{ item: T; sourceKey: LegacyPayrollStorageKey }>;
  primaryPresent: boolean;
  primaryCount: number;
  desktopRecordsCount: number;
} {
  const rawPrimary = reader(primaryKey);
  const parsedPrimary = normalizeArray<T>(safeParseJson(rawPrimary));

  const rawDesktop = reader('atrium_erp_desktop_v2');
  const parsedDesktopObj = safeParseJson<Record<string, unknown>>(rawDesktop);
  const parsedDesktop = parsedDesktopObj ? normalizeArray<T>(parsedDesktopObj[desktopField]) : [];

  const matchesScope = (item: T) => {
    const bOk = !businessId || !item.businessId || item.businessId === businessId;
    const brOk = !branchId || !item.branchId || item.branchId === branchId;
    return bOk && brOk;
  };

  const seenIds = new Set<string>();
  const combined: Array<{ item: T; sourceKey: LegacyPayrollStorageKey }> = [];

  for (const item of parsedPrimary) {
    if (!item || !item.id || !matchesScope(item)) continue;
    seenIds.add(item.id);
    combined.push({ item, sourceKey: primaryKey });
  }
  for (const item of parsedDesktop) {
    if (!item || !item.id || !matchesScope(item)) continue;
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    combined.push({ item, sourceKey: 'atrium_erp_desktop_v2' });
  }

  return {
    records: combined,
    primaryPresent: rawPrimary !== null,
    primaryCount: parsedPrimary.length,
    desktopRecordsCount: parsedDesktop.length,
  };
}

/**
 * Pure Read-Only Step 7a Dry-Run Inspector.
 * Guarantees ZERO database or API writes while diagnosing UUID mappings,
 * field drift against current store/remote records, period duplicate collisions,
 * and missing CCP/RIB disbursement coordinates.
 */
export function analyzePayrollMigrationDryRun(
  remoteState: PayrollDryRunRemoteState,
  storageReader: StorageReader = defaultStorageReader
): PayrollDryRunReport {
  const { businessId, branchId } = remoteState;

  const desktopRaw = storageReader('atrium_erp_desktop_v2');
  const desktopParsed = safeParseJson<Record<string, unknown>>(desktopRaw);

  const attBundle = collectScopedLegacyRecords<StaffAttendanceLogRecord>(
    'atrium_staff_attendance_logs_v1',
    'staffAttendanceLogs',
    storageReader,
    businessId,
    branchId
  );
  const advBundle = collectScopedLegacyRecords<StaffSalaryAdvance>(
    'atrium_staff_salary_advances_v1',
    'staffSalaryAdvances',
    storageReader,
    businessId,
    branchId
  );
  const runBundle = collectScopedLegacyRecords<StaffPayrollRunRecord>(
    'atrium_staff_payroll_runs_v1',
    'staffPayrollRuns',
    storageReader,
    businessId,
    branchId
  );
  const slipBundle = collectScopedLegacyRecords<StaffPayrollSlipRecord>(
    'atrium_staff_payroll_slips_v1',
    'staffPayrollSlips',
    storageReader,
    businessId,
    branchId
  );

  const scannedKeys: PayrollDryRunReport['scannedKeys'] = [
    {
      key: 'atrium_staff_attendance_logs_v1',
      present: attBundle.primaryPresent,
      recordCount: attBundle.primaryCount,
    },
    {
      key: 'atrium_staff_salary_advances_v1',
      present: advBundle.primaryPresent,
      recordCount: advBundle.primaryCount,
    },
    {
      key: 'atrium_staff_payroll_runs_v1',
      present: runBundle.primaryPresent,
      recordCount: runBundle.primaryCount,
    },
    {
      key: 'atrium_staff_payroll_slips_v1',
      present: slipBundle.primaryPresent,
      recordCount: slipBundle.primaryCount,
    },
    {
      key: 'atrium_erp_desktop_v2',
      present: desktopRaw !== null,
      recordCount: desktopParsed
        ? attBundle.desktopRecordsCount +
          advBundle.desktopRecordsCount +
          runBundle.desktopRecordsCount +
          slipBundle.desktopRecordsCount
        : 0,
    },
  ];

  const uuidMappings: PayrollUuidMappingEntry[] = [];
  const fieldDiffs: PayrollFieldDiffItem[] = [];

  const remoteAttByUuid = new Map<string, StaffAttendanceLogRecord>();
  remoteState.attendanceLogs.forEach((r) => {
    remoteAttByUuid.set(deterministicLegacyUuid(r.id), r);
  });

  const remoteAdvByUuid = new Map<string, StaffSalaryAdvance>();
  remoteState.salaryAdvances.forEach((r) => {
    remoteAdvByUuid.set(deterministicLegacyUuid(r.id), r);
  });

  const remoteRunByUuid = new Map<string, StaffPayrollRunRecord>();
  remoteState.payrollRuns.forEach((r) => {
    remoteRunByUuid.set(deterministicLegacyUuid(r.id), r);
  });

  const remoteSlipByUuid = new Map<string, StaffPayrollSlipRecord>();
  remoteState.payrollSlips.forEach((r) => {
    remoteSlipByUuid.set(deterministicLegacyUuid(r.id), r);
  });

  // 1. Attendance logs analysis
  let attMatched = 0;
  let attDiffs = 0;
  for (const { item, sourceKey } of attBundle.records) {
    const mappedUuid = deterministicLegacyUuid(item.id);
    uuidMappings.push({
      entityKind: 'attendance',
      legacyId: item.id,
      mappedUuid,
      alreadyUuid: isValidUuidFormat(item.id),
      label: `${item.staffName} (${item.date})`,
      sourceKey,
    });
    const remote = remoteAttByUuid.get(mappedUuid);
    if (remote) {
      attMatched += 1;
      const diffs = [
        compareScalarField('type', item.type, remote.type),
        compareScalarField('date', item.date, remote.date),
        compareScalarField('method', item.method, remote.method),
        compareScalarField('notes', item.notes || '', remote.notes || ''),
      ].filter((d): d is NonNullable<typeof d> => d !== null);
      if (diffs.length > 0) {
        attDiffs += 1;
        fieldDiffs.push({
          entityKind: 'attendance',
          legacyId: item.id,
          mappedUuid,
          label: `${item.staffName} · ${item.date}`,
          differences: diffs,
        });
      }
    }
  }

  // 2. Salary advances analysis
  let advMatched = 0;
  let advDiffs = 0;
  for (const { item, sourceKey } of advBundle.records) {
    const mappedUuid = deterministicLegacyUuid(item.id);
    uuidMappings.push({
      entityKind: 'advance',
      legacyId: item.id,
      mappedUuid,
      alreadyUuid: isValidUuidFormat(item.id),
      label: `${item.voucherNumber || item.id} · ${item.staffName}`,
      sourceKey,
    });
    const remote = remoteAdvByUuid.get(mappedUuid);
    if (remote) {
      advMatched += 1;
      const diffs = [
        compareScalarField('amountDzd', item.amountDzd, remote.amountDzd),
        compareScalarField('status', item.status, remote.status),
        compareScalarField('paymentMethod', item.paymentMethod, remote.paymentMethod),
        compareScalarField('deductedInPeriod', item.deductedInPeriod || '', remote.deductedInPeriod || ''),
      ].filter((d): d is NonNullable<typeof d> => d !== null);
      if (diffs.length > 0) {
        advDiffs += 1;
        fieldDiffs.push({
          entityKind: 'advance',
          legacyId: item.id,
          mappedUuid,
          label: `${item.voucherNumber || item.id} · ${item.staffName}`,
          differences: diffs,
        });
      }
    }
  }

  // 3. Payroll runs analysis + period duplicate collision detection
  let runMatched = 0;
  let runDiffs = 0;
  const periodBucket = new Map<string, PayrollPeriodCollision>();

  const registerRunForPeriod = (
    source: 'legacy_cache' | 'store_remote',
    run: StaffPayrollRunRecord
  ) => {
    const biz = run.businessId || businessId || 'default_biz';
    const br = run.branchId || branchId || 'default_branch';
    const runType = (run as StaffPayrollRunRecord & { runType?: string }).runType || 'regular';
    const adjustmentSeq = Number(
      (run as StaffPayrollRunRecord & { adjustmentSeq?: number }).adjustmentSeq ?? 0
    );
    const key = `${biz}::${br}::${run.periodYear}::${run.periodMonth}::${runType}::${adjustmentSeq}`;
    const existing = periodBucket.get(key) || {
      collisionKey: key,
      businessId: biz,
      branchId: br,
      periodYear: run.periodYear,
      periodMonth: run.periodMonth,
      runType,
      adjustmentSeq,
      sources: [],
    };
    existing.sources.push({
      source,
      runId: run.id,
      title: run.title,
      status: run.status,
    });
    periodBucket.set(key, existing);
  };

  for (const r of remoteState.payrollRuns) {
    registerRunForPeriod('store_remote', r);
  }

  for (const { item, sourceKey } of runBundle.records) {
    const mappedUuid = deterministicLegacyUuid(item.id);
    uuidMappings.push({
      entityKind: 'payroll_run',
      legacyId: item.id,
      mappedUuid,
      alreadyUuid: isValidUuidFormat(item.id),
      label: item.title || `${item.periodMonth}/${item.periodYear}`,
      sourceKey,
    });
    registerRunForPeriod('legacy_cache', item);

    const remote = remoteRunByUuid.get(mappedUuid);
    if (remote) {
      runMatched += 1;
      const diffs = [
        compareScalarField('status', item.status, remote.status),
        compareScalarField('totalGrossCotisable', item.totalGrossCotisable, remote.totalGrossCotisable),
        compareScalarField('totalCnasSalarial', item.totalCnasSalarial, remote.totalCnasSalarial),
        compareScalarField('totalIrg', item.totalIrg, remote.totalIrg),
        compareScalarField('totalNet', item.totalNet, remote.totalNet),
        compareScalarField('slipsCount', item.slipsCount, remote.slipsCount),
      ].filter((d): d is NonNullable<typeof d> => d !== null);
      if (diffs.length > 0) {
        runDiffs += 1;
        fieldDiffs.push({
          entityKind: 'payroll_run',
          legacyId: item.id,
          mappedUuid,
          label: item.title || `${item.periodMonth}/${item.periodYear}`,
          differences: diffs,
        });
      }
    }
  }

  // A collision occurs when >= 2 distinct run IDs occupy the same period tuple, OR a legacy run shares
  // a period tuple with a different remote run ID
  const periodCollisions = Array.from(periodBucket.values()).filter((bucket) => {
    const distinctMappedIds = new Set(bucket.sources.map((s) => deterministicLegacyUuid(s.runId)));
    return bucket.sources.length > 1 && distinctMappedIds.size > 1;
  });

  // 4. Payroll slips analysis
  let slipMatched = 0;
  let slipDiffs = 0;
  for (const { item, sourceKey } of slipBundle.records) {
    const mappedUuid = deterministicLegacyUuid(item.id);
    uuidMappings.push({
      entityKind: 'payroll_slip',
      legacyId: item.id,
      mappedUuid,
      alreadyUuid: isValidUuidFormat(item.id),
      label: `${item.staffFullName} (${item.periodLabel})`,
      sourceKey,
    });
    const remote = remoteSlipByUuid.get(mappedUuid);
    if (remote) {
      slipMatched += 1;
      const diffs = [
        compareScalarField('netAPayer', item.netAPayer, remote.netAPayer),
        compareScalarField('irgTax', item.irgTax, remote.irgTax),
        compareScalarField('cnasSalarial', item.cnasSalarial, remote.cnasSalarial),
        compareScalarField('isPaid', item.isPaid, remote.isPaid),
        compareScalarField('paymentMethod', item.paymentMethod, remote.paymentMethod),
      ].filter((d): d is NonNullable<typeof d> => d !== null);
      if (diffs.length > 0) {
        slipDiffs += 1;
        fieldDiffs.push({
          entityKind: 'payroll_slip',
          legacyId: item.id,
          mappedUuid,
          label: `${item.staffFullName} (${item.periodLabel})`,
          differences: diffs,
        });
      }
    }
  }

  // 5. Missing CCP / RIB checks on `ccp` or `bank` (`bank_transfer`) staff & slips
  const missingAccountWarnings: MissingDisbursementAccountWarning[] = [];
  for (const st of remoteState.staffList) {
    const method = (st.paymentMethod || 'cash').toLowerCase();
    if (method === 'ccp') {
      const missing: Array<'ccpNumber' | 'ccpKey' | 'bankRib'> = [];
      if (!st.ccpNumber || !st.ccpNumber.trim()) missing.push('ccpNumber');
      if (!st.ccpKey || !st.ccpKey.trim()) missing.push('ccpKey');
      if (missing.length > 0) {
        missingAccountWarnings.push({
          source: 'staff',
          entityId: st.id,
          staffName: st.fullName,
          paymentMethod: st.paymentMethod || 'ccp',
          missingFields: missing,
        });
      }
    } else if (method === 'bank' || method === 'bank_transfer') {
      if (!st.bankRib || !st.bankRib.trim()) {
        missingAccountWarnings.push({
          source: 'staff',
          entityId: st.id,
          staffName: st.fullName,
          paymentMethod: st.paymentMethod || 'bank_transfer',
          missingFields: ['bankRib'],
        });
      }
    }
  }

  for (const { item } of slipBundle.records) {
    const method = (item.paymentMethod || 'cash').toLowerCase();
    if (method === 'ccp') {
      const missing: Array<'ccpNumber' | 'ccpKey' | 'bankRib'> = [];
      if (!item.ccpNumber || !item.ccpNumber.trim()) missing.push('ccpNumber');
      if (!item.ccpKey || !item.ccpKey.trim()) missing.push('ccpKey');
      if (missing.length > 0) {
        missingAccountWarnings.push({
          source: 'payroll_slip',
          entityId: item.id,
          staffName: item.staffFullName,
          paymentMethod: item.paymentMethod,
          missingFields: missing,
        });
      }
    } else if (method === 'bank' || method === 'bank_transfer') {
      if (!item.bankRib || !item.bankRib.trim()) {
        missingAccountWarnings.push({
          source: 'payroll_slip',
          entityId: item.id,
          staffName: item.staffFullName,
          paymentMethod: item.paymentMethod,
          missingFields: ['bankRib'],
        });
      }
    }
  }

  const entitySummaries: PayrollDryRunEntitySummary[] = [
    {
      entityKind: 'attendance',
      legacyTotalCount: attBundle.records.length,
      newToRemoteCount: attBundle.records.length - attMatched,
      matchedRemoteCount: attMatched,
      fieldDiffCount: attDiffs,
      remoteTotalCount: remoteState.attendanceLogs.length,
    },
    {
      entityKind: 'advance',
      legacyTotalCount: advBundle.records.length,
      newToRemoteCount: advBundle.records.length - advMatched,
      matchedRemoteCount: advMatched,
      fieldDiffCount: advDiffs,
      remoteTotalCount: remoteState.salaryAdvances.length,
    },
    {
      entityKind: 'payroll_run',
      legacyTotalCount: runBundle.records.length,
      newToRemoteCount: runBundle.records.length - runMatched,
      matchedRemoteCount: runMatched,
      fieldDiffCount: runDiffs,
      remoteTotalCount: remoteState.payrollRuns.length,
    },
    {
      entityKind: 'payroll_slip',
      legacyTotalCount: slipBundle.records.length,
      newToRemoteCount: slipBundle.records.length - slipMatched,
      matchedRemoteCount: slipMatched,
      fieldDiffCount: slipDiffs,
      remoteTotalCount: remoteState.payrollSlips.length,
    },
  ];

  const hasBlockersOrWarnings =
    fieldDiffs.length > 0 ||
    periodCollisions.length > 0 ||
    missingAccountWarnings.length > 0;

  return {
    generatedAt: new Date().toISOString(),
    isReadOnlyDryRun: true,
    dbWritesExecuted: 0,
    gateStatus: 'AWAITING_GATE_4_APPROVAL',
    statutoryBasisBadge: 'Rates not verified (legacy basis)',
    businessId,
    branchId,
    scannedKeys,
    entitySummaries,
    uuidMappings,
    fieldDiffs,
    periodCollisions,
    missingAccountWarnings,
    hasBlockersOrWarnings,
  };
}

export function exportPayrollDryRunJson(report: PayrollDryRunReport): string {
  return JSON.stringify(report, null, 2);
}

function escapeCsvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportPayrollDryRunCsv(report: PayrollDryRunReport): string {
  const rows: string[] = [
    [
      'section',
      'entity_kind',
      'legacy_id',
      'mapped_uuid',
      'label',
      'status_or_detail',
      'statutory_basis',
    ].join(','),
  ];

  for (const summary of report.entitySummaries) {
    rows.push(
      [
        'summary',
        summary.entityKind,
        '',
        '',
        `legacy=${summary.legacyTotalCount};new=${summary.newToRemoteCount};matched=${summary.matchedRemoteCount};diffs=${summary.fieldDiffCount}`,
        `remote=${summary.remoteTotalCount}`,
        report.statutoryBasisBadge,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  for (const mapping of report.uuidMappings) {
    rows.push(
      [
        'uuid_mapping',
        mapping.entityKind,
        mapping.legacyId,
        mapping.mappedUuid,
        mapping.label,
        mapping.alreadyUuid ? 'already_uuid' : `mapped_from:${mapping.sourceKey}`,
        report.statutoryBasisBadge,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  for (const diff of report.fieldDiffs) {
    rows.push(
      [
        'field_diff',
        diff.entityKind,
        diff.legacyId,
        diff.mappedUuid,
        diff.label,
        diff.differences
          .map((d) => `${d.field}:${String(d.localValue)}->${String(d.remoteValue)}`)
          .join(' | '),
        report.statutoryBasisBadge,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  for (const col of report.periodCollisions) {
    rows.push(
      [
        'period_collision',
        'payroll_run',
        col.sources.map((s) => s.runId).join(';'),
        '',
        `${col.periodMonth}/${col.periodYear} (${col.runType}#${col.adjustmentSeq})`,
        col.sources.map((s) => `${s.source}:${s.runId}(${s.status})`).join(' | '),
        report.statutoryBasisBadge,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  for (const warn of report.missingAccountWarnings) {
    rows.push(
      [
        'missing_ccp_rib',
        warn.source,
        warn.entityId,
        deterministicLegacyUuid(warn.entityId),
        warn.staffName,
        `${warn.paymentMethod}:missing=${warn.missingFields.join('+')}`,
        report.statutoryBasisBadge,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  return rows.join('\n');
}
