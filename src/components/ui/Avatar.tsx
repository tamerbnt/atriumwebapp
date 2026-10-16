import React from 'react';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string;
  className?: string;
}

const AVATAR_COLORS = [
  '#C4785A', // Terracotta Brand
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#EC4899', // Pink
];

export const Avatar: React.FC<AvatarProps> = ({ name, size = 38, imageUrl, className = '' }) => {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';
  const colorIndex = (name || '').charCodeAt(0) % AVATAR_COLORS.length;
  const bgColor = AVATAR_COLORS[colorIndex];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size, borderRadius: '50%' }}
        className={`object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bgColor,
        fontSize: Math.max(12, Math.round(size * 0.38)),
      }}
      className={`flex items-center justify-center font-bold text-white shrink-0 select-none shadow-sm ${className}`}
      title={name}
    >
      {initial}
    </div>
  );
};
