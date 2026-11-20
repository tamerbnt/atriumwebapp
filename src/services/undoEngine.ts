import { useEffect, useMemo, useState } from 'react';
import {
  BusinessCategory,
  SupportedLanguage,
  ToastType,
  UndoHistoryEntry,
  UndoOperationType,
  UndoVerticalKey,
} from '../types/index';

export const UNDO_TOAST_DURATION_MS = 6000;
export const REGULAR_TOAST_DURATION_MS = 3000;
export const UNDO_EXIT_ANIMATION_MS = 220;
export const UNDO_HOVER_GRACE_MS = 2000;
export const MAX_UNDO_HISTORY_PER_BRANCH = 50;

export interface FacilityAccentPalette {
  light: string;
  lightDim: string;
  dark: string;
  darkDim: string;
}

const FACILITY_ACCENT_MAP: Record<BusinessCategory, FacilityAccentPalette> = {
  membership_session: {
    light: '#C9461F',
    lightDim: 'rgba(201, 70, 31, 0.12)',
    dark: '#FF8F63',
    darkDim: 'rgba(255, 143, 99, 0.16)',
  },
  appointment_service: {
    light: '#DB2777',
    lightDim: 'rgba(219, 39, 119, 0.12)',
    dark: '#F472B6',
    darkDim: 'rgba(244, 114, 182, 0.16)',
  },
  pos_inventory: {
    light: '#D97706',
    lightDim: 'rgba(217, 119, 6, 0.12)',
    dark: '#FBBF24',
    darkDim: 'rgba(251, 191, 36, 0.16)',
  },
  trading_commercial: {
    light: '#4F46E5',
    lightDim: 'rgba(79, 70, 229, 0.12)',
    dark: '#818CF8',
    darkDim: 'rgba(129, 140, 248, 0.16)',
  },
  education_cohort: {
    light: '#7C3AED',
    lightDim: 'rgba(124, 58, 237, 0.12)',
    dark: '#A78BFA',
    darkDim: 'rgba(167, 139, 250, 0.16)',
  },
  rental_booking: {
    light: '#0D9488',
    lightDim: 'rgba(13, 148, 136, 0.12)',
    dark: '#2DD4BF',
    darkDim: 'rgba(45, 212, 191, 0.16)',
  },
  freelance_solo: {
    light: '#0284C7',
    lightDim: 'rgba(2, 132, 199, 0.12)',
    dark: '#38BDF8',
    darkDim: 'rgba(56, 189, 248, 0.16)',
  },
  project_milestone: {
    light: '#C9461F',
    lightDim: 'rgba(201, 70, 31, 0.12)',
    dark: '#FF8F63',
    darkDim: 'rgba(255, 143, 99, 0.16)',
  },
  medical_clinic: {
    light: '#059669',
    lightDim: 'rgba(5, 150, 105, 0.12)',
    dark: '#34D399',
    darkDim: 'rgba(52, 211, 153, 0.16)',
  },
  auto_garage: {
    light: '#EA580C',
    lightDim: 'rgba(234, 88, 12, 0.12)',
    dark: '#FB923C',
    darkDim: 'rgba(251, 146, 60, 0.16)',
  },
  real_estate: {
    light: '#0F766E',
    lightDim: 'rgba(15, 118, 110, 0.12)',
    dark: '#2DD4BF',
    darkDim: 'rgba(45, 212, 191, 0.16)',
  },
  manufacturing_production: {
    light: '#2563EB',
    lightDim: 'rgba(37, 99, 235, 0.12)',
    dark: '#60A5FA',
    darkDim: 'rgba(96, 165, 250, 0.16)',
  },
  legal_accounting: {
    light: '#9F1239',
    lightDim: 'rgba(159, 18, 57, 0.12)',
    dark: '#FB7185',
    darkDim: 'rgba(251, 113, 133, 0.16)',
  },
  logistics_delivery: {
    light: '#0891B2',
    lightDim: 'rgba(8, 145, 178, 0.12)',
    dark: '#22D3EE',
    darkDim: 'rgba(34, 211, 238, 0.16)',
  },
  construction_contractor: {
    light: '#B45309',
    lightDim: 'rgba(180, 83, 9, 0.12)',
    dark: '#FBBF24',
    darkDim: 'rgba(251, 191, 36, 0.16)',
  },
  agriculture_farming: {
    light: '#15803D',
    lightDim: 'rgba(21, 128, 61, 0.12)',
    dark: '#4ADE80',
    darkDim: 'rgba(74, 222, 128, 0.16)',
  },
};

export function getFacilityAccentForCategory(
  category: BusinessCategory | undefined,
  theme: 'light' | 'dark' = 'light'
): { accent: string; accentDim: string } {
  const palette = category ? FACILITY_ACCENT_MAP[category] : FACILITY_ACCENT_MAP.membership_session;
  if (!palette) {
    return theme === 'dark'
      ? { accent: '#FF8F63', accentDim: 'rgba(255, 143, 99, 0.16)' }
      : { accent: '#C9461F', accentDim: 'rgba(201, 70, 31, 0.12)' };
  }
  return theme === 'dark'
    ? { accent: palette.dark, accentDim: palette.darkDim }
    : { accent: palette.light, accentDim: palette.lightDim };
}

export function applyFacilityAccentCssVars(
  category: BusinessCategory | undefined,
  theme: 'light' | 'dark' = 'light'
): void {
  if (typeof document === 'undefined') return;
  const { accent, accentDim } = getFacilityAccentForCategory(category, theme);
  document.documentElement.style.setProperty('--facility-accent', accent);
  document.documentElement.style.setProperty('--facility-accent-dim', accentDim);
}

export function cloneSnapshot<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // fallback below
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getUndoButtonLabel(language: SupportedLanguage = 'fr'): string {
  if (language === 'ar') return 'تراجع';
  if (language === 'en') return 'Undo';
  return 'Annuler';
}

export function getRedoButtonLabel(language: SupportedLanguage = 'fr'): string {
  if (language === 'ar') return 'إعادة';
  if (language === 'en') return 'Redo';
  return 'Rétablir';
}

export function getVerticalDisplayName(vertical: UndoVerticalKey, language: SupportedLanguage = 'fr'): string {
  const labels: Record<UndoVerticalKey, { en: string; fr: string; ar: string }> = {
    membership_session: { en: 'Membership & Gym', fr: 'Adhérents & Sport', ar: 'الاشتراكات والرياضة' },
    appointment_service: { en: 'Salon & Appointments', fr: 'Salon & Rendez-vous', ar: 'الصالون والمواعيد' },
    pos_inventory: { en: 'POS & Retail', fr: 'Caisse & POS', ar: 'نقطة البيع والمخزون' },
    trading_commercial: { en: 'B2B Trading', fr: 'Négoce & Gros', ar: 'التجارة والجملة' },
    education_cohort: { en: 'Education & Academy', fr: 'École & Académie', ar: 'التعليم والأكاديمية' },
    rental_booking: { en: 'Venue & Rentals', fr: 'Locations & Salles', ar: 'الكراء والقاعات' },
    freelance_solo: { en: 'Freelance & Solo', fr: 'Freelance & Solo', ar: 'العمل الحر' },
    project_milestone: { en: 'Projects & Agency', fr: 'Projets & Agence', ar: 'المشاريع والوكالة' },
    medical_clinic: { en: 'Medical Clinic', fr: 'Clinique Médicale', ar: 'العيادة الطبية' },
    auto_garage: { en: 'Auto Garage', fr: 'Garage Auto', ar: 'مرآب السيارات' },
    real_estate: { en: 'Real Estate', fr: 'Immobilier', ar: 'العقارات' },
    manufacturing_production: { en: 'Manufacturing', fr: 'Fabrication & Usine', ar: 'التصنيع والإنتاج' },
    legal_accounting: { en: 'Legal & Accounting', fr: 'Juridique & Compta', ar: 'المحاماة والمحاسبة' },
    logistics_delivery: { en: 'Logistics & Delivery', fr: 'Logistique & Colis', ar: 'اللوجستيك والتوصيل' },
    construction_contractor: { en: 'Construction & BTP', fr: 'Chantiers & BTP', ar: 'المقاولات والبناء' },
    agriculture_farming: { en: 'Agriculture & Farm', fr: 'Agriculture & Ferme', ar: 'الفلاحة والزراعة' },
    staff: { en: 'Staff & HR', fr: 'Équipe & RH', ar: 'الموظفون والموارد' },
    settings: { en: 'Settings', fr: 'Paramètres', ar: 'الإعدادات' },
  };
  return labels[vertical]?.[language] || labels[vertical]?.fr || String(vertical);
}

export function getOperationDisplayName(opType: UndoOperationType, language: SupportedLanguage = 'fr'): string {
  const map: Record<UndoOperationType, { en: string; fr: string; ar: string }> = {
    create: { en: 'Create', fr: 'Création', ar: 'إنشاء' },
    edit: { en: 'Edit', fr: 'Modification', ar: 'تعديل' },
    status: { en: 'Status', fr: 'Statut', ar: 'تغيير الحالة' },
    delete: { en: 'Delete', fr: 'Suppression', ar: 'حذف' },
    bulk: { en: 'Bulk', fr: 'Lot', ar: 'عملية جماعية' },
  };
  return map[opType]?.[language] || opType;
}

export function pickLocalizedText(
  language: SupportedLanguage = 'fr',
  copy: { fr: string; en: string; ar: string }
): string {
  return copy[language] || copy.fr;
}

export interface UndoToastBridge {
  emitToast: (opts: {
    type: ToastType;
    title: string;
    message: string;
    duration?: number;
    hasUndo?: boolean;
    undoLabel?: string;
    onUndo?: () => Promise<void> | void;
    category?: BusinessCategory;
  }) => void;
  getContext: () => {
    businessId: string;
    branchId: string;
    category: BusinessCategory;
    language: SupportedLanguage;
  };
}

let toastBridge: UndoToastBridge | null = null;

export function configureUndoToastBridge(bridge: UndoToastBridge): void {
  toastBridge = bridge;
}

let undoHistoryEntries: UndoHistoryEntry[] = [];
const historyListeners = new Set<() => void>();
const inFlightUndoIds = new Set<string>();
let applyingUndoDepth = 0;
let activeBatchCollector: RegisterUndoParams[] | null = null;
let activeBatchDepth = 0;

function notifyHistoryListeners(): void {
  historyListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // keep notifying other subscribers
    }
  });
}

export function isApplyingUndo(): boolean {
  return applyingUndoDepth > 0;
}

export async function runInsideUndoGuard<T>(fn: () => Promise<T> | T): Promise<T> {
  applyingUndoDepth += 1;
  try {
    return await fn();
  } finally {
    applyingUndoDepth = Math.max(0, applyingUndoDepth - 1);
  }
}

export function subscribeUndoHistory(listener: () => void): () => void {
  historyListeners.add(listener);
  return () => {
    historyListeners.delete(listener);
  };
}

export function getUndoHistoryEntries(filters?: {
  businessId?: string;
  branchId?: string;
}): UndoHistoryEntry[] {
  if (!filters?.businessId && !filters?.branchId) {
    return undoHistoryEntries;
  }
  return undoHistoryEntries.filter((entry) => {
    if (filters.businessId && entry.businessId !== filters.businessId) return false;
    if (filters.branchId && entry.branchId !== filters.branchId) return false;
    return true;
  });
}

export interface RegisterUndoParams {
  vertical: UndoVerticalKey;
  operationType: UndoOperationType;
  summary: string;
  entityLabel?: string;
  affectedCount?: number;
  businessId?: string;
  branchId?: string;
  toastType?: ToastType;
  toastTitle?: string;
  toastMessage?: string;
  undoLabel?: string;
  showToast?: boolean;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
}

export function registerUndoEntry(params: RegisterUndoParams): UndoHistoryEntry | null {
  if (isApplyingUndo()) {
    return null;
  }

  if (activeBatchCollector !== null) {
    activeBatchCollector.push(params);
    return null;
  }

  const ctx = toastBridge?.getContext();
  const businessId = params.businessId || ctx?.businessId || 'global';
  const branchId = params.branchId || ctx?.branchId || 'global';
  const language = ctx?.language || 'fr';
  const category = ctx?.category;

  const entryId = `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const entry: UndoHistoryEntry = {
    id: entryId,
    vertical: params.vertical,
    businessId,
    branchId,
    operationType: params.operationType,
    summary: params.summary,
    entityLabel: params.entityLabel,
    affectedCount: params.affectedCount,
    status: 'available',
    createdAt: Date.now(),
    canRedo: typeof params.redo === 'function',
    undo: params.undo,
    redo: params.redo,
  };

  // Enforce per-branch cap (max 50 entries per branch while keeping other branches intact)
  const sameBranchEntries: UndoHistoryEntry[] = [entry];
  const otherBranchEntries: UndoHistoryEntry[] = [];
  for (const existing of undoHistoryEntries) {
    if (existing.businessId === businessId && existing.branchId === branchId) {
      if (sameBranchEntries.length < MAX_UNDO_HISTORY_PER_BRANCH) {
        sameBranchEntries.push(existing);
      }
    } else {
      otherBranchEntries.push(existing);
    }
  }

  undoHistoryEntries = [...sameBranchEntries, ...otherBranchEntries].sort(
    (a, b) => b.createdAt - a.createdAt
  );
  notifyHistoryListeners();

  if (params.showToast !== false && toastBridge) {
    toastBridge.emitToast({
      type: params.toastType || 'success',
      title: params.toastTitle || getVerticalDisplayName(params.vertical, language),
      message: params.toastMessage || params.summary,
      duration: UNDO_TOAST_DURATION_MS,
      hasUndo: true,
      undoLabel: params.undoLabel || getUndoButtonLabel(language),
      category,
      onUndo: () => triggerUndoById(entryId),
    });
  }

  return entry;
}

export interface UndoBatchOptions {
  vertical: UndoVerticalKey;
  summary: string;
  operationType?: UndoOperationType;
  entityLabel?: string;
  affectedCount?: number;
  businessId?: string;
  branchId?: string;
  toastType?: ToastType;
  toastTitle?: string;
  toastMessage?: string;
  showToast?: boolean;
}

/**
 * Coalesces multiple mutations executed synchronously within `fn()` into a
 * single atomic `bulk` Undo/Redo entry so bulk deletes/status updates undo in
 * one click instead of emitting N separate Undo pills.
 */
export function runUndoBatch<T>(opts: UndoBatchOptions, fn: () => T): T {
  if (isApplyingUndo()) {
    return fn();
  }
  const isOuterBatch = activeBatchDepth === 0;
  if (isOuterBatch) {
    activeBatchCollector = [];
  }
  activeBatchDepth += 1;
  try {
    return fn();
  } finally {
    activeBatchDepth = Math.max(0, activeBatchDepth - 1);
    if (isOuterBatch) {
      const collected = activeBatchCollector || [];
      activeBatchCollector = null;
      if (collected.length === 1) {
        const single = collected[0];
        registerUndoEntry({
          ...single,
          summary: opts.summary || single.summary,
          operationType: opts.operationType || single.operationType,
          affectedCount: opts.affectedCount ?? single.affectedCount,
          toastType: opts.toastType ?? single.toastType,
          showToast: opts.showToast ?? single.showToast,
        });
      } else if (collected.length > 1) {
        const canRedoAll = collected.every((item) => typeof item.redo === 'function');
        registerUndoEntry({
          vertical: opts.vertical,
          operationType: opts.operationType || 'bulk',
          summary: opts.summary,
          entityLabel: opts.entityLabel,
          affectedCount: opts.affectedCount ?? collected.length,
          businessId: opts.businessId,
          branchId: opts.branchId,
          toastType: opts.toastType || 'info',
          toastTitle: opts.toastTitle,
          toastMessage: opts.toastMessage,
          showToast: opts.showToast,
          undo: async () => {
            for (let i = collected.length - 1; i >= 0; i -= 1) {
              await collected[i].undo();
            }
          },
          redo: canRedoAll
            ? async () => {
                for (let i = 0; i < collected.length; i += 1) {
                  await collected[i].redo?.();
                }
              }
            : undefined,
        });
      }
    }
  }
}

export function executeUndoable<T>(
  params: Omit<RegisterUndoParams, 'undo'> & {
    apply: () => T;
    undo: (appliedResult: T) => Promise<void> | void;
  }
): T {
  const result = params.apply();
  if (!isApplyingUndo()) {
    registerUndoEntry({
      vertical: params.vertical,
      operationType: params.operationType,
      summary: params.summary,
      entityLabel: params.entityLabel,
      affectedCount: params.affectedCount,
      businessId: params.businessId,
      branchId: params.branchId,
      toastType: params.toastType,
      toastTitle: params.toastTitle,
      toastMessage: params.toastMessage,
      undoLabel: params.undoLabel,
      showToast: params.showToast,
      undo: () => params.undo(result),
      redo: params.redo,
    });
  }
  return result;
}

export async function triggerUndoById(entryId: string): Promise<boolean> {
  if (inFlightUndoIds.has(entryId)) return false;
  const entry = undoHistoryEntries.find((e) => e.id === entryId);
  if (!entry || entry.status === 'undone') return false;

  inFlightUndoIds.add(entryId);
  const ctx = toastBridge?.getContext();
  const language = ctx?.language || 'fr';

  try {
    await runInsideUndoGuard(async () => {
      await entry.undo();
    });

    undoHistoryEntries = undoHistoryEntries.map((item) =>
      item.id === entryId
        ? { ...item, status: 'undone', undoneAt: Date.now(), lastError: undefined }
        : item
    );
    notifyHistoryListeners();

    if (toastBridge) {
      toastBridge.emitToast({
        type: 'info',
        title:
          language === 'ar'
            ? 'تم التراجع'
            : language === 'en'
            ? 'Action undone'
            : 'Action annulée',
        message: entry.summary,
        duration: 2500,
        hasUndo: false,
        category: ctx?.category,
      });
    }
    return true;
  } catch (err: any) {
    const errMsg = err?.message || 'Undo failed';
    undoHistoryEntries = undoHistoryEntries.map((item) =>
      item.id === entryId ? { ...item, status: 'error', lastError: errMsg } : item
    );
    notifyHistoryListeners();

    if (toastBridge) {
      toastBridge.emitToast({
        type: 'error',
        title:
          language === 'ar'
            ? 'تعذر التراجع'
            : language === 'en'
            ? 'Undo failed'
            : "Échec de l'annulation",
        message: errMsg,
        duration: 3500,
        hasUndo: false,
        category: ctx?.category,
      });
    }
    return false;
  } finally {
    inFlightUndoIds.delete(entryId);
  }
}

export async function triggerRedoById(entryId: string): Promise<boolean> {
  if (inFlightUndoIds.has(entryId)) return false;
  const entry = undoHistoryEntries.find((e) => e.id === entryId);
  if (!entry || entry.status !== 'undone' || !entry.redo) return false;

  inFlightUndoIds.add(entryId);
  const ctx = toastBridge?.getContext();
  const language = ctx?.language || 'fr';

  try {
    await runInsideUndoGuard(async () => {
      await entry.redo!();
    });

    undoHistoryEntries = undoHistoryEntries.map((item) =>
      item.id === entryId
        ? { ...item, status: 'available', undoneAt: undefined, lastError: undefined }
        : item
    );
    notifyHistoryListeners();

    if (toastBridge) {
      toastBridge.emitToast({
        type: 'success',
        title:
          language === 'ar'
            ? 'تمت الإعادة'
            : language === 'en'
            ? 'Action reapplied'
            : 'Action rétablie',
        message: entry.summary,
        duration: UNDO_TOAST_DURATION_MS,
        hasUndo: true,
        undoLabel: getUndoButtonLabel(language),
        category: ctx?.category,
        onUndo: () => triggerUndoById(entryId),
      });
    }
    return true;
  } catch (err: any) {
    if (toastBridge) {
      toastBridge.emitToast({
        type: 'error',
        title: language === 'ar' ? 'خطأ' : language === 'en' ? 'Redo failed' : 'Erreur',
        message: err?.message || 'Redo failed',
        duration: 3000,
        hasUndo: false,
        category: ctx?.category,
      });
    }
    return false;
  } finally {
    inFlightUndoIds.delete(entryId);
  }
}

export async function undoLatestForBranch(
  businessId?: string,
  branchId?: string
): Promise<boolean> {
  const candidate = undoHistoryEntries.find((e) => {
    if (e.status !== 'available') return false;
    if (businessId && e.businessId !== businessId) return false;
    if (branchId && e.branchId !== branchId) return false;
    return true;
  });
  if (!candidate) return false;
  return triggerUndoById(candidate.id);
}

export function clearUndoHistory(businessId?: string, branchId?: string): void {
  if (!businessId && !branchId) {
    undoHistoryEntries = [];
  } else {
    undoHistoryEntries = undoHistoryEntries.filter((e) => {
      if (businessId && e.businessId !== businessId) return true;
      if (branchId && e.branchId !== branchId) return true;
      return false;
    });
  }
  notifyHistoryListeners();
}

export function resetUndoEngineForTests(): void {
  undoHistoryEntries = [];
  inFlightUndoIds.clear();
  applyingUndoDepth = 0;
  activeBatchCollector = null;
  activeBatchDepth = 0;
  notifyHistoryListeners();
}

export function useUndoHistory(businessId?: string, branchId?: string) {
  const [entries, setEntries] = useState<UndoHistoryEntry[]>(() =>
    getUndoHistoryEntries({ businessId, branchId })
  );

  useEffect(() => {
    const refresh = () => setEntries(getUndoHistoryEntries({ businessId, branchId }));
    refresh();
    return subscribeUndoHistory(refresh);
  }, [businessId, branchId]);

  const availableCount = useMemo(
    () => entries.filter((e) => e.status === 'available').length,
    [entries]
  );

  return {
    entries,
    availableCount,
    undoById: triggerUndoById,
    redoById: triggerRedoById,
    undoLatest: () => undoLatestForBranch(businessId, branchId),
    clearHistory: () => clearUndoHistory(businessId, branchId),
  };
}
