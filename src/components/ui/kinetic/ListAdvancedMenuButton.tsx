import React, { useMemo } from 'react';
import {
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { LiveDropdownMenu, LiveMenuItem } from '../live/LiveDropdownMenu';
import { LiveIconButton } from '../live/LiveIconButton';
import { useScreenFocus } from './ScreenFocusContext';

export interface ListAdvancedMenuButtonProps {
  language?: string;
  podId?: string | null;
  canResetFilters?: boolean;
  onResetAllFilters?: () => void;
  onPrint?: () => void;
  extraItems?: LiveMenuItem[];
  className?: string;
}

export const ListAdvancedMenuButton: React.FC<ListAdvancedMenuButtonProps> =
  React.memo(
    ({
      language = 'fr',
      podId = null,
      canResetFilters = false,
      onResetAllFilters,
      onPrint,
      extraItems,
      className = '',
    }) => {
      const focusCtx = useScreenFocus();
      const isAr = language === 'ar';
      const isEn = language === 'en';
      const isExpanded = Boolean(focusCtx?.isExpanded);

      const labels = useMemo(
        () => ({
          menuAria: isAr
            ? 'خيارات متقدمة للقائمة'
            : isEn
            ? 'Advanced list options'
            : 'Options avancées de la liste',
          expand: isAr
            ? 'توسيع القائمة'
            : isEn
            ? 'Expand List'
            : 'Agrandir la liste',
          expandDesc: isAr
            ? 'استغلال مساحة المؤشرات العلوية'
            : isEn
            ? 'Collapse upper KPI pods'
            : 'Masquer les indicateurs du haut',
          restore: isAr
            ? 'استعادة العرض'
            : isEn
            ? 'Restore View'
            : 'Restaurer la vue',
          restoreDesc: isAr
            ? 'إظهار بطاقات الملخص العلوية'
            : isEn
            ? 'Show KPI and summary pods'
            : 'Afficher les indicateurs du haut',
          print: isAr
            ? 'طباعة القائمة'
            : isEn
            ? 'Print List'
            : 'Imprimer la liste',
          reset: isAr
            ? 'إعادة تعيين الفلاتر والبحث'
            : isEn
            ? 'Reset Filters & Search'
            : 'Réinitialiser les filtres',
        }),
        [isAr, isEn]
      );

      if (!focusCtx?.eligible) {
        return null;
      }

      const items: LiveMenuItem[] = [
        {
          id: 'toggle-expand-pod',
          label: isExpanded ? labels.restore : labels.expand,
          description: isExpanded ? labels.restoreDesc : labels.expandDesc,
          icon: isExpanded ? (
            <Minimize2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <Maximize2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          ),
          onClick: () => focusCtx.requestToggleExpand(podId),
        },
        {
          id: 'print-current-pod',
          label: labels.print,
          icon: <Printer className="w-4 h-4 shrink-0" strokeWidth={1.75} />,
          onClick: () => {
            if (onPrint) {
              onPrint();
            } else {
              focusCtx.printPod(podId);
            }
          },
        },
      ];

      if (onResetAllFilters) {
        items.push({ type: 'separator' });
        items.push({
          id: 'reset-filters',
          label: labels.reset,
          icon: <RotateCcw className="w-4 h-4 shrink-0" strokeWidth={1.75} />,
          disabled: !canResetFilters,
          onClick: () => onResetAllFilters(),
        });
      }

      if (extraItems && extraItems.length > 0) {
        items.push({ type: 'separator' });
        items.push(...extraItems);
      }

      return (
        <div className={`shrink-0 no-print ${className}`}>
          <LiveDropdownMenu
            placement={isAr ? 'bottom-start' : 'bottom-end'}
            aria-label={labels.menuAria}
            items={items}
            trigger={(triggerProps, { open }) => (
              <LiveIconButton
                ref={triggerProps.ref as React.Ref<HTMLButtonElement>}
                type="button"
                size={40}
                shape="squircle"
                tone={isExpanded ? 'outline' : 'soft'}
                aria-label={labels.menuAria}
                aria-haspopup={triggerProps['aria-haspopup']}
                aria-expanded={triggerProps['aria-expanded']}
                title={labels.menuAria}
                onClick={triggerProps.onClick}
                className={
                  open || isExpanded
                    ? 'bg-[#d4522f]/12 dark:bg-[#d4522f]/18 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] [--sq-stroke:rgba(201,70,31,0.5)]'
                    : 'bg-white dark:bg-[#22201E] hover:bg-[#FBF8F5] dark:hover:bg-[#2B2825]'
                }
                icon={<MoreHorizontal size={18} strokeWidth={1.75} />}
              />
            )}
          />
        </div>
      );
    }
  );

ListAdvancedMenuButton.displayName = 'ListAdvancedMenuButton';
