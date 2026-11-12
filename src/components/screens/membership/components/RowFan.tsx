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
  onEdit,
  onMessage,
  onDelete,
  memberName = '',
  className = '',
}) => {
  const fanActions = [
    {
      id: 'edit',
      i: 2,
      label: memberName ? `Modifier ${memberName}` : 'Modifier',
      icon: <Pencil className="w-[15px] h-[15px]" />,
      isDanger: false,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => onEdit?.(e),
    },
    {
      id: 'mail',
      i: 1,
      label: memberName ? `Écrire à ${memberName}` : 'Envoyer un message',
      icon: <Mail className="w-[15px] h-[15px]" />,
      isDanger: false,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => onMessage?.(e),
    },
    {
      id: 'del',
      i: 0,
      label: memberName ? `Supprimer ${memberName}` : 'Supprimer',
      icon: <Trash2 className="w-[15px] h-[15px]" />,
      isDanger: true,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => onDelete?.(e),
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
          className={`act cursor-pointer border-0 bg-[var(--atr-bg,#F3EDE7)] text-[var(--atr-ink,#1B1917)] dark:bg-[#2B2927] dark:text-[#F2ECE6] ${
            action.isDanger ? 'd' : ''
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
