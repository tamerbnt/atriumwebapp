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
  const fanActions: RowFanAction[] = actions || [
    {
      id: 'edit',
      label: memberName ? `Modifier ${memberName}` : 'Modifier',
      icon: <Pencil className="w-4 h-4" />,
      onClick: (e) => onEdit?.(e),
    },
    {
      id: 'mail',
      label: memberName ? `Écrire à ${memberName}` : 'Envoyer un message',
      icon: <Mail className="w-4 h-4" />,
      onClick: (e) => onMessage?.(e),
    },
    {
      id: 'del',
      label: memberName ? `Supprimer ${memberName}` : 'Supprimer',
      icon: <Trash2 className="w-4 h-4" />,
      isDanger: true,
      onClick: (e) => onDelete?.(e),
    },
  ];

  // In the prototype:
  // First in array has highest index (left-most when fanned out, e.g. --i: 2 for Edit)
  // Last in array has index 0 (closest to chevron button, e.g. --i: 0 for Delete)
  const total = fanActions.length;

  return (
    <div className={`pointer-events-none ${className}`}>
      {fanActions.map((action, index) => {
        const i = total - 1 - index; // 2, 1, 0 for 3 actions
        return (
          <button
            key={action.id}
            type="button"
            style={
              {
                '--i': i,
                position: 'absolute',
                top: '18px',
                right: '18px',
                zIndex: 2,
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                cursor: 'pointer',
              } as React.CSSProperties
            }
            className={`act pointer-events-auto border border-[#E6DED6] dark:border-[#3A3734] bg-[#F3EDE7] dark:bg-[#2A2A2A] transition-colors duration-150 ${
              action.isDanger
                ? 'd hover:!bg-[#C9441F] hover:!text-white text-[#1B1917] dark:text-[#EAE3DC]'
                : 'hover:!bg-[#FBE7DF] hover:!text-[#C9441F] text-[#1B1917] dark:text-[#EAE3DC]'
            }`}
            aria-label={action.label}
            title={action.label}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick(e);
            }}
          >
            {action.icon}
          </button>
        );
      })}
    </div>
  );
};
