import { useCallback, useRef, useState } from 'react';
import type { ChartCardFilter, ChartCardFilterOption } from '@/atrium';

export function useCardFilters<T extends Record<string, string>>(initial: T) {
  const [filters, setFilters] = useState<T>(() => ({ ...initial }));
  const initialRef = useRef(initial);
  initialRef.current = initial;

  const setFilter = useCallback(<K extends keyof T & string>(key: K, value: string) => {
    setFilters((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const filterCacheRef = useRef<Record<string, ChartCardFilter>>({});
  const handlersRef = useRef<Record<string, (nextId: string) => void>>({});

  const makeFilter = useCallback(
    <K extends keyof T & string>(
      key: K,
      options: ChartCardFilterOption[],
      ariaLabel?: string
    ): ChartCardFilter => {
      const value = filters[key] ?? initialRef.current[key] ?? options[0]?.id ?? '';
      const cached = filterCacheRef.current[key];
      if (
        cached &&
        cached.value === value &&
        cached.ariaLabel === ariaLabel &&
        cached.options.length === options.length &&
        cached.options.every((opt, i) => opt.id === options[i]?.id && opt.label === options[i]?.label)
      ) {
        return cached;
      }
      let onChange = handlersRef.current[key];
      if (!onChange) {
        onChange = (nextId: string) => setFilter(key, nextId);
        handlersRef.current[key] = onChange;
      }
      const next: ChartCardFilter = {
        options,
        value,
        onChange,
        ariaLabel,
      };
      filterCacheRef.current[key] = next;
      return next;
    },
    [filters, setFilter]
  );

  return { filters, setFilter, makeFilter };
}
