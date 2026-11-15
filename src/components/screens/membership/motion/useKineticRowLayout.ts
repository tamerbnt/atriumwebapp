import { useMemo } from 'react';
import {
  useKineticCollectionLayout,
  KineticRowDomRefs,
  ROW_H,
  ROW_G,
  ROW_DH,
  ROW_B,
  CARD_H,
} from '../../../ui/kinetic/useKineticCollectionLayout';
import { Member } from '../../../../types/index';

export { ROW_H, ROW_G, ROW_DH, ROW_B, CARD_H };

export type RowDomRefs = KineticRowDomRefs;

export interface KineticRenderedRow {
  id: string;
  member: Member;
  isMatching: boolean;
}

export interface UseKineticRowLayoutOptions {
  matchingMembers: Member[];
  expandedMemberIds: Set<string>;
  viewMode: 'list' | 'grid';
  filterKey: string;
  rowsElRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  openMemberId?: string | null;
  onPruneSelection?: (hiddenIds: string[]) => void;
  onFilterChange?: () => void;
}

const memberKeyExtractor = (m: Member) => m.id;

export function useKineticRowLayout({
  matchingMembers,
  expandedMemberIds,
  viewMode,
  filterKey,
  rowsElRef,
  scrollContainerRef,
  openMemberId,
  onPruneSelection,
  onFilterChange,
}: UseKineticRowLayoutOptions) {
  const { renderedRows, registerRowRefs, hasVisibleRows } = useKineticCollectionLayout<Member>({
    items: matchingMembers,
    keyExtractor: memberKeyExtractor,
    expandedIds: expandedMemberIds,
    viewMode,
    filterKey,
    rowsElRef,
    scrollContainerRef,
    openItemId: openMemberId,
    onPruneSelection,
    onFilterChange,
  });

  const mappedRows = useMemo<KineticRenderedRow[]>(
    () =>
      renderedRows.map((row) => ({
        id: row.id,
        member: row.item,
        isMatching: row.isMatching,
      })),
    [renderedRows]
  );

  return {
    renderedRows: mappedRows,
    registerRowRefs,
    hasVisibleRows,
  };
}
