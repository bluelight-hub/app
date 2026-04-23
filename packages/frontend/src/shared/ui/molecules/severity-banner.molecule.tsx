import type { ReactNode } from 'react';
import { PiInfoFill, PiWarningFill, PiXCircleFill } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';

export type SeverityBannerVariant = 'info' | 'warning' | 'danger';

interface SeverityBannerAction {
  label: string;
  onClick: () => void;
}

interface SeverityBannerProps {
  variant: SeverityBannerVariant;
  title?: string;
  description?: ReactNode;
  action?: SeverityBannerAction;
  className?: string;
  'data-testid'?: string;
}

/**
 * SeverityBanner — zentrale Komponente für nicht-toastige Inline-
 * Benachrichtigungen (UX-DR21 Zero-Toast-Policy). Wird für Konflikt-Hinweise
 * (AC10 Story 2.2), kritische Bekanntgaben (Story 3.3) und eskalierende
 * Rückmeldungen verwendet.
 *
 * Im Unterschied zur reinen `Alert`-Atom liefert der Banner Block-Layout mit
 * optionaler Action-Button-Integration und konsistenter Breite für Page-
 * Header-Regions.
 */
export function SeverityBanner({ variant, title, description, action, className, 'data-testid': testId }: SeverityBannerProps) {
  const variantStyles: Record<SeverityBannerVariant, string> = {
    info: 'bg-status-info-surface border-status-info-border text-status-info-text',
    warning: 'bg-status-warning-surface border-status-warning-border text-status-warning-text',
    danger: 'bg-status-danger-surface border-status-danger-border text-status-danger-text',
  };

  const icons: Record<SeverityBannerVariant, ReactNode> = {
    info: <PiInfoFill className="h-5 w-5" aria-hidden="true" />,
    warning: <PiWarningFill className="h-5 w-5" aria-hidden="true" />,
    danger: <PiXCircleFill className="h-5 w-5" aria-hidden="true" />,
  };

  // `warning` + `danger` brauchen assertive Live-Region, `info` nicht.
  const role = variant === 'info' ? 'status' : 'alert';
  const ariaLive = variant === 'info' ? 'polite' : 'assertive';

  return (
    <div role={role} aria-live={ariaLive} data-testid={testId} data-variant={variant} className={cn('flex items-start gap-3 rounded-panel border p-4', variantStyles[variant], className)}>
      <div className="flex-shrink-0">{icons[variant]}</div>
      <div className="flex-1 space-y-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        {description ? <div className="text-sm">{description}</div> : null}
      </div>
      {action ? (
        <div className="flex-shrink-0">
          <Button intent="secondary" appearance="outline" type="button" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
