import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface FilterSelectOption {
  value: string | number;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface FilterSelectProps {
  value?: string | number;
  onChange: (val: any) => void;
  options: (FilterSelectOption | string)[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  value: controlledValue,
  onChange,
  options,
  placeholder = 'All',
  label,
  icon,
  searchable = false,
  disabled = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openUpward, setOpenUpward] = useState(false);

  const normalizedOptions: FilterSelectOption[] = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(controlledValue)
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Viewport collision check
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 200 && rect.top > 200) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Focus search
  useEffect(() => {
    if (isOpen && (searchable || normalizedOptions.length >= 6)) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    }
  }, [isOpen, searchable, normalizedOptions.length]);

  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    return opt.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelect = (val: string | number) => {
    setIsOpen(false);
    setSearchQuery('');
    // Emit hybrid value
    const hybrid: any = new String(val);
    hybrid.target = { value: val };
    hybrid.currentTarget = { value: val };
    hybrid.value = val;
    hybrid.valueOf = () => val;
    hybrid.toString = () => String(val);
    onChange(hybrid);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={`h-8 px-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-[#C4785A]/50 focus:outline-none focus:ring-1 focus:ring-[#C4785A] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs ${
          isOpen ? 'ring-1 ring-[#C4785A] border-[#C4785A]' : ''
        }`}
      >
        {icon && <span className="text-neutral-400 shrink-0">{icon}</span>}
        {label && <span className="text-neutral-400 font-normal">{label}:</span>}
        <span className="truncate max-w-[140px] font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {selectedOption?.count !== undefined && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] tabular-nums">
            {selectedOption.count}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`shrink-0 text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#C4785A]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute left-0 z-50 min-w-[160px] max-w-[240px] rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {(searchable || normalizedOptions.length >= 6) && (
            <div className="p-1.5 border-b border-neutral-100 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/50">
              <div className="relative flex items-center">
                <Search
                  size={12}
                  className="absolute left-2 text-neutral-400 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter..."
                  className="w-full h-6 pl-6 pr-6 text-[11px] bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#C4785A]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 text-neutral-400 hover:text-neutral-600 p-0.5"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          )}

          <ul className="py-1 max-h-48 overflow-y-auto focus:outline-none text-xs">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-center text-neutral-400 italic text-[11px]">
                No options
              </li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(controlledValue);
                return (
                  <li
                    key={String(opt.value)}
                    onClick={() => {
                      if (!opt.disabled) handleSelect(opt.value);
                    }}
                    className={`px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#C4785A]/10 text-[#C4785A] font-semibold'
                        : 'hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {opt.count !== undefined && (
                        <span className="text-[10px] text-neutral-400 tabular-nums">
                          ({opt.count})
                        </span>
                      )}
                      {isSelected && (
                        <Check size={12} className="text-[#C4785A]" strokeWidth={2.5} />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FilterSelect;
