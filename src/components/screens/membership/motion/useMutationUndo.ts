/**
 * Mutation Engine with Snapshot and Undo Toast Support
 * Follows the prototype pattern: mut(ids, fn, message)
 */

import { useState, useRef, useCallback } from 'react';

export interface UndoToastState {
  id: string;
  message: string;
  visible: boolean;
  onUndo: (() => void) | null;
}

export function useMutationUndo<T extends { id: string | number }>(
  items: T[],
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  onNotify?: (message: string) => void
) {
  const [toast, setToast] = useState<UndoToastState>({
    id: '',
    message: '',
    visible: false,
    onUndo: null,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const triggerUndo = useCallback(() => {
    if (toast.onUndo) {
      toast.onUndo();
    }
    dismissToast();
  }, [toast, dismissToast]);

  const mut = useCallback(
    (
      ids: (string | number)[],
      mutationFn: (item: T) => void,
      message: string
    ) => {
      // 1. Snapshot items before mutation
      const idSet = new Set(ids.map(String));
      const snapshots = items
        .filter((item) => idSet.has(String(item.id)))
        .map((item) => ({ id: item.id, data: JSON.parse(JSON.stringify(item)) as T }));

      // 2. Apply mutation
      setItems((prev) =>
        prev.map((item) => {
          if (idSet.has(String(item.id))) {
            const clone = JSON.parse(JSON.stringify(item)) as T;
            mutationFn(clone);
            return clone;
          }
          return item;
        })
      );

      // 3. Prepare Undo handler
      const undoFn = () => {
        setItems((currentItems) =>
          currentItems.map((item) => {
            const found = snapshots.find((s) => String(s.id) === String(item.id));
            return found ? found.data : item;
          })
        );
        if (onNotify) {
          onNotify(`Annulation effectuée`);
        }
      };

      // 4. Trigger Toast
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({
        id: Math.random().toString(36).slice(2),
        message,
        visible: true,
        onUndo: undoFn,
      });

      if (onNotify) {
        onNotify(message);
      }

      timerRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 6500);
    },
    [items, setItems, onNotify]
  );

  return {
    mut,
    toast,
    dismissToast,
    triggerUndo,
  };
}
