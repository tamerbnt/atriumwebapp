import React from 'react';
import { Pencil, Mail, Trash2 } from 'lucide-react';

export interface KineticRowFanAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  isDanger?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface KineticRowFanProps {
  actions?: KineticRowFanAction[];
  onEdit?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSecondaryAction?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  secondaryIcon?: React.ReactNode;
  secondaryLabel?: string;
  onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  recordTitle?: string;
  className?: string;
}

export const KineticRowFan: React.FC<KineticRowFanProps> = React.memo(({
  actions,
  onEdit,
  onSecondaryAction,
  secondaryIcon,
  secondaryLabel,
  onDelete,
  recordTitle = '',
  className = '',
}) => {
  const defaultActions: KineticRowFanAction[] = [];

  if (actions && actions.length > 0) {
    // Up to 3 fan actions preserving --i stagger indices right-to-left
    const capped = actions.slice(0, 3);
    capped.forEach((act) => defaultActions.push(act));
  } else {
    if (onEdit) {
      defaultActions.push({
        id: 'edit',
        label: recordTitle ? `Modifier ${recordTitle}` : 'Modifier',
        icon: <Pencil className="w-[15px] h-[15px]" />,
        isDanger: false,
        onClick: onEdit,
      });
    }
    if (onSecondaryAction) {
      defaultActions.push({
        id: 'secondary',
        label: secondaryLabel || (recordTitle ? `Action pour ${recordTitle}` : 'Action'),
        icon: secondaryIcon || <Mail className="w-[15px] h-[15px]" />,
        isDanger: false,
        onClick: onSecondaryAction,
      });
    }
    if (onDelete) {
      defaultActions.push({
        id: 'del',
        label: recordTitle ? `Supprimer ${recordTitle}` : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: onDelete,
      });
    }
  }

  const count = defaultActions.length;

  return (
    <>
      {defaultActions.map((action, idx) => {
        const staggerIdx = count - 1 - idx;
        return (
          <button
            key={action.id}
            type="button"
            data-no-liquid="true"
            data-a={action.id}
            style={{ '--i': staggerIdx } as React.CSSProperties}
            className={`act cursor-pointer border-0 bg-[var(--atr-bg,#F3EDE7)] text-[var(--atr-ink,#000000)] dark:bg-[#2B2927] dark:text-white ${
              action.isDanger ? 'act-danger' : ''
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
        );
      })}
    </>
  );
});

KineticRowFan.displayName = 'KineticRowFan';
