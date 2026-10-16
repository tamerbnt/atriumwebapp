import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Search by name, phone, email, RFID...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={18}
        className="absolute left-3.5 text-neutral-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-9 text-sm rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white transition-all placeholder:text-neutral-400 shadow-2xs"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-0.5"
          title="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
