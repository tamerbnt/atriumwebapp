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
        style={{
          backgroundColor: 'var(--color-card-bg)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--radius-input)',
          color: 'var(--color-text-primary)',
        }}
        className="w-full h-11 pl-10 pr-9 text-sm border focus:outline-none focus:border-[#C4785A] focus:ring-3 focus:ring-[#C4785A]/20 transition-all placeholder:text-neutral-400"
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
