import type { ComponentType } from 'react';
import { Button } from '@/shared/ui/atoms/button.atom';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

/**
 * EmptyState-Komponente für leere Zustände (z.B. leere Tabellen)
 *
 * Zeigt ein Icon, einen Titel, eine Beschreibung und optionale Aktionen an.
 */
export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center py-12">
      <Icon className="mb-4 h-12 w-12 text-text-muted" />
      <h3 className="mb-1 text-lg font-medium text-text-primary">{title}</h3>
      <p className="mb-6 max-w-sm text-center text-sm text-text-muted">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button intent="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button appearance="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
