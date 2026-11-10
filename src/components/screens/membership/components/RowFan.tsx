import React from 'react';
import { Pencil, Mail, Trash2 } from 'lucide-react';

export interface RowFanAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  isDanger?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface RowFanProps {
  actions?: RowFanAction[];
  onEdit?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMessage?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  memberName?: string;
  className?: string;
}

export const RowFan: React.FC<RowFanProps> = ({
  actions,
  onEdit,
  onMessage,
  onDelete,
  memberName = '',
  className = '',
}) => {
  const fanActions = [
    {
      id: 'del',
      i: 0,
      label: memberName ? `Supprimer ${memberName}` : 'Supprimer',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      isDanger: true,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => onDelete?.(e),
    },
    {
      id: 'mail',
      i: 1,
      label: memberName ? `Écrire à ${memberName}` : 'Envoyer un message',
      icon: <Mail className="w-3.5 h-3.5" />,
      isDanger: false,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => onMessage?.(e),
    },
    {
      id: 'edit',
      i: 2,
      label: memberName ? `Modifier ${memberName}` : 'Modifier',
      icon: <Pencil className="w-3.5 h-3.5" />,
      isDanger: false,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => onEdit?.(e),
    },
  ];

  return (
    <>
      {fanActions.map((action) => (
        <button
          key={action.id}
          type="button"
          data-no-liquid="true"
          data-a={action.id}
          style={{ '--i': action.i } as React.CSSProperties}
          className={`act pointer-events-auto border border-[#E6DED6] dark:border-[#3A3734] bg-[#F3EDE7] dark:bg-[#2A2A2A] transition-colors duration-150 ${
            action.isDanger
              ? 'd hover:!bg-[#E8643F] hover:!text-[#0A0A0A] text-[#1B1917] dark:text-[#EAE3DC]'
              : 'hover:!bg-[#FBE7DF] hover:!text-[#C9441F] text-[#1B1917] dark:text-[#EAE3DC]'
          } ${className}`}
          aria-label={action.label}
          title={action.label}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick(e);
          }}
        >
          {action.icon}
        </button>
      ))}
    </>
  );
};
