import { useState, useEffect, useRef, useCallback } from 'react';
import { Sp, clamp, TUNES } from './adherentsMotion';
import { Member } from '../../../../types/index';

export const ROW_H = 68;
export const ROW_G = 8;
export const ROW_DH = 176;
export const ROW_B = 36;

export interface KineticRowRenderData {
  id: string;
  member: Member;
  pValue: number;
  eValue: number;
  y: number;
  height: number;
  isMatching: boolean;
}

interface ManagedRow {
  id: string;
  member: Member;
  p: Sp;
  e: Sp;
  isMatching: boolean;
  orderKey: number;
}

export interface UseKineticRowLayoutOptions {
  matchingMembers: Member[];
  expandedMemberIds: Set<string>;
  onPruneSelection?: (hiddenIds: string[]) => void;
  onFilterChange?: () => void;
}

export function useKineticRowLayout({
  matchingMembers,
  expandedMemberIds,
  onPruneSelection,
  onFilterChange,
}: UseKineticRowLayoutOptions) {
  const managedRowsRef = useRef<ManagedRow[]>([]);
  const [renderRows, setRenderRows] = useState<KineticRowRenderData[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);

  // Keep a stable ref to callbacks
  const onPruneRef = useRef(onPruneSelection);
  onPruneRef.current = onPruneSelection;

  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  // Track matching member IDs set
  const matchingIds = useRef(new Set<string>());
  const prevMatchingIds = useRef<string[]>([]);

  // Function to recompute y positions and container height across all managed rows
  const syncLayout = useCallback(() => {
    const rows = managedRowsRef.current;
    if (rows.length === 0) {
      setRenderRows([]);
      setContainerHeight(0);
      return;
    }

    // Check if any non-matching rows are ready to be pruned:
    // "Remove a row from the DOM only when it is not visible, p.target=0, and both p and e are at rest."
    const toPrune: string[] = [];
    const activeRows: ManagedRow[] = [];

    for (const r of rows) {
      if (!r.isMatching && r.p.target === 0 && r.p.rest() && r.e.rest() && r.p.x < 0.02) {
        toPrune.push(r.id);
        r.p.destroy();
        r.e.destroy();
      } else {
        activeRows.push(r);
      }
    }

    if (toPrune.length > 0) {
      managedRowsRef.current = activeRows;
      onPruneRef.current?.(toPrune);
    }

    // "Keep DOM order equal to visual order."
    // Active rows are ordered: matching rows by matchingMembers order, non-matching maintain relative position
    let runningY = 0;
    const computedRenderRows: KineticRowRenderData[] = [];

    for (let i = 0; i < activeRows.length; i++) {
      const r = activeRows[i];
      const pVal = r.p.x;
      const eVal = r.e.x;

      // y of a row = running sum over rows above of qv*(H+G) + clamp(e,0,1)*qv*(DH+G), where qv = clamp(p/100, 0, 1.05).
      const qv = clamp(pVal / 100, 0, 1.05);
      const eNorm = clamp(eVal / 100, 0, 1);
      const rowHeight = qv * (ROW_H + ROW_G) + eNorm * qv * (ROW_DH + ROW_G);

      computedRenderRows.push({
        id: r.id,
        member: r.member,
        pValue: pVal,
        eValue: eVal,
        y: runningY,
        height: rowHeight,
        isMatching: r.isMatching,
      });

      runningY += rowHeight;
    }

    setRenderRows(computedRenderRows);
    setContainerHeight(runningY);
  }, []);

  // Update rows when matchingMembers or expandedMemberIds change
  useEffect(() => {
    const currentMatchingSet = new Set(matchingMembers.map((m) => m.id));
    const isFilterChanged =
      currentMatchingSet.size !== matchingIds.current.size ||
      matchingMembers.some((m) => !matchingIds.current.has(m.id));

    matchingIds.current = currentMatchingSet;

    const existingMap = new Map<string, ManagedRow>();
    managedRowsRef.current.forEach((r) => existingMap.set(r.id, r));

    const prunedHiddenIds: string[] = [];
    const newManagedRows: ManagedRow[] = [];

    // 1. Add / update matching rows in order of matchingMembers (keeps DOM order equal to visual order)
    matchingMembers.forEach((member, index) => {
      const existing = existingMap.get(member.id);
      const isExpanded = expandedMemberIds.has(member.id);

      if (existing) {
        existing.member = member;
        existing.isMatching = true;
        existing.orderKey = index;
        existing.p.setTarget(100);
        existing.e.setTarget(isExpanded ? 100 : 0);
        newManagedRows.push(existing);
        existingMap.delete(member.id);
      } else {
        // "matching rows -> p.target=100 (create at p=0 if missing so it grows in place)"
        const p = new Sp(0, TUNES.rowPresence);
        const e = new Sp(0, TUNES.rowExpand);

        const newRow: ManagedRow = {
          id: member.id,
          member,
          p,
          e,
          isMatching: true,
          orderKey: index,
        };

        p.subscribe(() => syncLayout());
        e.subscribe(() => syncLayout());

        p.setTarget(100);
        e.setTarget(isExpanded ? 100 : 0);

        newManagedRows.push(newRow);
      }
    });

    // 2. Any rows in existingMap are non-matching:
    // "non-matching -> p.target=0 and e.target=0. Prune hidden rows from the selection."
    existingMap.forEach((nonMatchingRow) => {
      nonMatchingRow.isMatching = false;
      nonMatchingRow.p.setTarget(0);
      nonMatchingRow.e.setTarget(0);
      prunedHiddenIds.push(nonMatchingRow.id);
      newManagedRows.push(nonMatchingRow);
    });

    managedRowsRef.current = newManagedRows;

    if (prunedHiddenIds.length > 0) {
      onPruneRef.current?.(prunedHiddenIds);
    }

    if (isFilterChanged) {
      onFilterChangeRef.current?.();
    }

    syncLayout();
  }, [matchingMembers, expandedMemberIds, syncLayout]);

  // Clean up all springs on unmount
  useEffect(() => {
    return () => {
      managedRowsRef.current.forEach((r) => {
        r.p.destroy();
        r.e.destroy();
      });
      managedRowsRef.current = [];
    };
  }, []);

  return {
    renderRows,
    containerHeight,
    hasVisibleRows: renderRows.length > 0,
    syncLayout,
  };
}
