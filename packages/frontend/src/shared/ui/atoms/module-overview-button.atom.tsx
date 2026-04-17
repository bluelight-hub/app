import { cn } from '@/shared/ui/cn';
import { PiGridFour } from 'react-icons/pi';
import { Button } from './button.atom';

interface ModuleOverviewButtonProps {
  onClick: () => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * Icon-only-Button für die Workspace-Aktionen-Zone, der die Modulübersicht öffnet.
 *
 * Fixe Größe 40×40 px, Icon 18 px (Action-Button-Icon-Vertrag), border-subtle,
 * Hover → action-secondary, focus-visible → shadow-focus-ring.
 */
export function ModuleOverviewButton({ onClick, className, 'aria-label': ariaLabel = 'Modulübersicht öffnen' }: ModuleOverviewButtonProps) {
  return (
    <Button
      intent="secondary"
      appearance="outline"
      size="icon"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        'h-10 w-10 shrink-0 rounded-control border-border-subtle bg-surface-panel text-text-secondary transition-[background-color,border-color,color,box-shadow]',
        'hover:border-border-strong hover:bg-action-secondary hover:text-text-primary',
        'focus-visible:shadow-focus-ring',
        className,
      )}
    >
      <PiGridFour className="h-[18px] w-[18px]" aria-hidden="true" />
    </Button>
  );
}
