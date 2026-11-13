import React from 'react';
import { Seek } from './Seek';
import { useAtriumStore } from '../../services/store';

export interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  openWidth?: number;
  shutSize?: number;
  onSearch?: (val: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  openWidth = 260,
  shutSize = 40,
  onSearch,
}) => {
  const { language } = useAtriumStore();
  const defaultPlaceholder = language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...';

  return (
    <Seek
      value={value}
      onChange={onChange}
      placeholder={placeholder || defaultPlaceholder}
      className={className}
      openWidth={openWidth}
      shutSize={shutSize}
      onSearch={onSearch}
    />
  );
};

export default SearchBox;
