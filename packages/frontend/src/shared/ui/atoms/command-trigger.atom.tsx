import { cn } from '@/shared/ui/cn';
import { Button } from './button.atom';
import { PiMagnifyingGlass } from 'react-icons/pi';

interface CommandTriggerProps {
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'compact';
  'aria-label'?: string;
}

export function CommandTrigger({ onClick, className, variant = 'default', 'aria-label': ariaLabel = 'Befehle und Navigation' }: CommandTriggerProps) {
  return (
    <Button
      intent="secondary"
      appearance="outline"
      kbd="cmd+K"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        'inline-flex items-center gap-2 rounded-control border-border-subtle bg-surface-panel px-3 py-1.5 text-body-sm font-medium text-text-secondary shadow-raised transition-[background-color,border-color,color,box-shadow]',
        'hover:bg-action-secondary hover:text-text-primary',
        'focus-visible:shadow-focus-ring',
        className,
      )}
    >
      <PiMagnifyingGlass className="h-4 w-4" />
      {variant === 'default' && <span className="hidden sm:inline">Befehle & Navigation</span>}
    </Button>
  );
}
