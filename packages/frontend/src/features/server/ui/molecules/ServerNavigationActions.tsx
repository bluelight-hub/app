import { Button } from '@/components/ui/button';
import { cn } from '@/shared/ui/cn';
import type { ComponentProps } from 'react';
import type { IconType } from 'react-icons';

type ButtonVariant = NonNullable<ComponentProps<typeof Button>['variant']>;

export interface ServerNavigationAction {
  id: string;
  label: string;
  onClick?: () => void;
  icon?: IconType;
  variant?: ButtonVariant;
  disabled?: boolean;
  isActive?: boolean;
}

export interface ServerNavigationActionsProps {
  actions: readonly ServerNavigationAction[];
  className?: string;
}

/**
 * Vereinheitlichte Navigation für Login, Setup und Serververwaltung.
 * Nutzt überall dieselben Button-Grundstile und Interaktionsmuster.
 */
export function ServerNavigationActions({ actions, className }: ServerNavigationActionsProps) {
  return (
    <nav aria-label="Server-Navigation" className={cn('flex flex-wrap items-center gap-2', className)}>
      {actions.map((action) => {
        const variant = action.variant ?? (action.isActive ? 'secondary' : 'outline');
        const Icon = action.icon;

        return (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant={variant}
            className="rounded-md"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-current={action.isActive ? 'page' : undefined}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            <span>{action.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
