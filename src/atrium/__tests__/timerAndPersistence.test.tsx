import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  startTimerAction,
  pauseTimerAction,
  resumeTimerAction,
  stopTimerAction,
  resetTimerAction,
  getTimerState,
  subscribeAtriumStore,
  subscribeTimerState,
  useAtriumSelector,
  useTimerSelector,
  flushAtriumPersist,
  showToast,
  openFastSwitchAction,
  closeFastSwitchAction,
  openOnboardingAction,
  closeOnboardingAction,
  switchBusinessAction,
} from '../../services/store';
import {
  resetUndoEngineForTests,
  undoLatestForBranch,
  redoLatestForBranch,
  configureUndoToastBridge,
} from '../../services/undoEngine';

const TRANSIENT_KEYS = [
  'toasts',
  'concurrencyConflicts',
  'isSyncing',
  'isSyncTimeout',
  'syncErrorMessage',
  'supabaseStatus',
  'isOnboardingOpen',
  'isFastSwitchOpen',
  'isDesktopUpgradeModalOpen',
  'desktopUpgradeReason',
] as const;

describe('Phase D & E — 1 Hz timer micro-store isolation, undo/redo sync & persistence hardening', () => {
  beforeEach(() => {
    resetUndoEngineForTests();
    configureUndoToastBridge({
      emitToast: () => {},
      getContext: () => ({
        businessId: 'biz_freelance',
        branchId: 'branch_freelance_main',
        category: 'freelance_solo',
        language: 'fr',
      }),
    });
    switchBusinessAction('biz_freelance');
    resetTimerAction();
  });

  afterEach(() => {
    resetTimerAction();
    closeFastSwitchAction();
    closeOnboardingAction();
    vi.useRealTimers();
  });

  it('keeps main store subscribers and scoped React selectors silent across 60 timer ticks while syncing stop/undo/redo', async () => {
    vi.useFakeTimers();

    let mainNotifications = 0;
    let timerNotifications = 0;
    let lastSelectedTimeLogsLength = -1;

    const unsubMain = subscribeAtriumStore(() => {
      mainNotifications += 1;
    });
    const unsubTimer = subscribeTimerState(() => {
      timerNotifications += 1;
    });

    const Probe: React.FC = () => {
      lastSelectedTimeLogsLength = useAtriumSelector((s) => s.timeLogs.length);
      const elapsed = useTimerSelector((t) => t.elapsedSeconds);
      return <span data-elapsed={elapsed}>{elapsed}</span>;
    };

    const initialMarkup = renderToStaticMarkup(<Probe />);
    expect(initialMarkup).toContain('data-elapsed="0"');
    const initialLogCount = lastSelectedTimeLogsLength;

    startTimerAction('cli_1', 'Client Alpha', 'prj_1', 'Refonte Web', 'Audit perf');
    expect(mainNotifications).toBe(1);
    expect(timerNotifications).toBe(1);

    // Advance 60 ticks (60 seconds): timer store ticks 60 times, main store ticks 0 times
    vi.advanceTimersByTime(60_000);
    expect(timerNotifications).toBe(61);
    expect(mainNotifications).toBe(1);
    expect(getTimerState().elapsedSeconds).toBe(60);

    const tickedMarkup = renderToStaticMarkup(<Probe />);
    expect(tickedMarkup).toContain('data-elapsed="60"');

    // Pause stops ticks; resume continues
    pauseTimerAction();
    expect(mainNotifications).toBe(2);
    vi.advanceTimersByTime(10_000);
    expect(getTimerState().elapsedSeconds).toBe(60);

    resumeTimerAction();
    expect(mainNotifications).toBe(3);
    vi.advanceTimersByTime(15_000);
    expect(getTimerState().elapsedSeconds).toBe(75);
    expect(mainNotifications).toBe(3);

    // Stop logs the 75-second entry and registers undo
    const entry = stopTimerAction();
    expect(entry).not.toBeNull();
    expect(entry!.durationSeconds).toBe(75);
    expect(getTimerState().isRunning).toBe(false);
    expect(getTimerState().elapsedSeconds).toBe(0);

    renderToStaticMarkup(<Probe />);
    expect(lastSelectedTimeLogsLength).toBe(initialLogCount + 1);

    // Undo removes the logged time entry; redo restores it
    const undone = await undoLatestForBranch('biz_freelance', 'branch_freelance_main');
    expect(undone).toBe(true);
    renderToStaticMarkup(<Probe />);
    expect(lastSelectedTimeLogsLength).toBe(initialLogCount);

    const redone = await redoLatestForBranch('biz_freelance', 'branch_freelance_main');
    expect(redone).toBe(true);
    renderToStaticMarkup(<Probe />);
    expect(lastSelectedTimeLogsLength).toBe(initialLogCount + 1);

    // Reset mid-run can be undone back to the paused/active timer snapshot
    startTimerAction('cli_1', 'Client Alpha', 'prj_1', 'Refonte Web', 'Sprint 2');
    vi.advanceTimersByTime(15_000);
    expect(getTimerState().elapsedSeconds).toBe(15);
    resetTimerAction();
    expect(getTimerState().elapsedSeconds).toBe(0);
    expect(getTimerState().isRunning).toBe(false);

    const resetUndone = await undoLatestForBranch('biz_freelance', 'branch_freelance_main');
    expect(resetUndone).toBe(true);
    expect(getTimerState().elapsedSeconds).toBe(15);

    unsubMain();
    unsubTimer();
  });

  it('flushAtriumPersist strips transient UI keys, syncs drifted timerState, and serializes within frame budget', () => {
    vi.useFakeTimers();

    const storageMap = new Map<string, string>();
    const prevWindow = (globalThis as any).window;
    const prevLocalStorage = (globalThis as any).localStorage;

    const mockStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storageMap.set(k, String(v));
      },
      removeItem: (k: string) => {
        storageMap.delete(k);
      },
      clear: () => {
        storageMap.clear();
      },
      key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
      get length() {
        return storageMap.size;
      },
    };

    try {
      (globalThis as any).window = prevWindow || {};
      (globalThis as any).localStorage = mockStorage;

      showToast({
        type: 'info',
        title: 'Transient Toast',
        message: 'Should not be persisted',
      });
      openFastSwitchAction();
      openOnboardingAction();

      startTimerAction('cli_1', 'Client Alpha', 'prj_1', 'Refonte Web', 'Persist check');
      vi.advanceTimersByTime(45_000);

      const t0 = performance.now();
      flushAtriumPersist();
      const serializeMs = performance.now() - t0;

      const raw = storageMap.get('atrium_erp_desktop_v2');
      expect(raw).toBeTypeOf('string');
      expect(raw!.length).toBeGreaterThan(100);

      const parsed = JSON.parse(raw!);
      expect(parsed.activeTimer.elapsedSeconds).toBe(45);
      expect(parsed.activeTimer.isRunning).toBe(true);

      for (const transientKey of TRANSIENT_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(parsed, transientKey)).toBe(false);
      }

      // Single-key serialization stays well inside interactive frame budget (16 ms)
      expect(serializeMs).toBeLessThan(16);
    } finally {
      if (prevWindow === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = prevWindow;

      if (prevLocalStorage === undefined) delete (globalThis as any).localStorage;
      else (globalThis as any).localStorage = prevLocalStorage;
    }
  });
});
