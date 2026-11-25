import React from 'react';
import { Pencil, Mail, Trash2 } from 'lucide-react';

export interface KineticRowFanAction<_T = unknown> {
  id: string;
  label: string;
  icon: React.ReactNode;
  isDanger?: boolean;
  disabled?: boolean;
  tooltip?: string;
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
        icon: <Pencil className="w-4 h-4" />,
        isDanger: false,
        onClick: onEdit,
      });
    }
    if (onSecondaryAction) {
      defaultActions.push({
        id: 'secondary',
        label: secondaryLabel || (recordTitle ? `Action pour ${recordTitle}` : 'Action'),
        icon: secondaryIcon || <Mail className="w-4 h-4" />,
        isDanger: false,
        onClick: onSecondaryAction,
      });
    }
    if (onDelete) {
      defaultActions.push({
        id: 'del',
        label: recordTitle ? `Supprimer ${recordTitle}` : 'Supprimer',
        icon: <Trash2 className="w-4 h-4" />,
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
            disabled={action.disabled}
            style={{ '--i': staggerIdx } as React.CSSProperties}
            className={`act border-0 bg-[var(--atr-bg,#F3EDE7)] text-[var(--atr-ink,#000000)] dark:bg-[#2B2927] dark:text-white disabled:opacity-45 disabled:cursor-not-allowed ${
              action.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            } ${
              action.isDanger ? 'act-danger' : ''
            } ${className}`}
            aria-label={action.label}
            title={action.tooltip || action.label}
            onClick={(e) => {
              e.stopPropagation();
              if (!action.disabled) action.onClick(e);
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
