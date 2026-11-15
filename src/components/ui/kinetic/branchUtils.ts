import { SupportedLanguage } from '../../../types/index';

export interface BranchLookupEntry {
  id?: string;
  name: string;
  code?: string;
}

export interface ResolvedBranchInfo {
  id: string;
  name: string;
  code: string;
}

export function buildBranchesByIdMap(
  branches?: Array<{ id: string; name: string; code?: string }> | null
): Map<string, BranchLookupEntry> {
  const map = new Map<string, BranchLookupEntry>();
  if (!Array.isArray(branches)) return map;
  for (let i = 0; i < branches.length; i++) {
    const b = branches[i];
    if (b && b.id) {
      map.set(b.id, { id: b.id, name: b.name, code: b.code });
    }
  }
  return map;
}

export function resolveRecordBranch(
  record: any,
  branchesById: ReadonlyMap<string, BranchLookupEntry> | null | undefined,
  currentBranch?: { id?: string; name?: string; code?: string } | null,
  language: SupportedLanguage | string = 'fr'
): ResolvedBranchInfo {
  const fallbackName =
    currentBranch?.name ||
    (language === 'ar' ? 'الفرع الرئيسي' : language === 'fr' ? 'Branche principale' : 'Main Branch');

  if (!record || typeof record !== 'object') {
    return {
      id: currentBranch?.id || '',
      name: fallbackName,
      code: currentBranch?.code || '',
    };
  }

  const rawId = String(
    record.branchId ||
      record.facilityId ||
      record.warehouseId ||
      record.siteId ||
      record.agencyId ||
      record.locationId ||
      record.depotId ||
      currentBranch?.id ||
      ''
  );

  const info = rawId && branchesById ? branchesById.get(rawId) : undefined;
  const directName =
    typeof record.branchName === 'string' && record.branchName.trim()
      ? record.branchName.trim()
      : typeof record.facilityName === 'string' && record.facilityName.trim()
      ? record.facilityName.trim()
      : typeof record.warehouseName === 'string' && record.warehouseName.trim()
      ? record.warehouseName.trim()
      : typeof record.branch?.name === 'string' && record.branch.name.trim()
      ? record.branch.name.trim()
      : '';

  return {
    id: rawId,
    name: info?.name || directName || fallbackName,
    code: info?.code || currentBranch?.code || '',
  };
}

/**
 * Leak-proof CSV download using Blob + immediate URL.revokeObjectURL cleanup.
 */
export function downloadCsvSafe(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): void {
  if (typeof document === 'undefined') return;
  const escapeCell = (val: string | number | boolean | null | undefined) => {
    const s = val === null || val === undefined ? '' : String(val);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csvBody =
    '\uFEFF' +
    [
      headers.map((h) => escapeCell(h)).join(','),
      ...rows.map((r) => r.map((cell) => escapeCell(cell)).join(',')),
    ].join('\n');

  const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
