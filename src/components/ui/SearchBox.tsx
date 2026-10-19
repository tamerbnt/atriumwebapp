import React from 'react';
import { Seek } from './Seek';

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
  placeholder = 'Search by name, phone, email, RFID...',
  className = '',
  openWidth = 260,
  shutSize = 40,
  onSearch,
}) => {
  return (
    <Seek
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      openWidth={openWidth}
      shutSize={shutSize}
      onSearch={onSearch}
    />
  );
};

export default SearchBox;
