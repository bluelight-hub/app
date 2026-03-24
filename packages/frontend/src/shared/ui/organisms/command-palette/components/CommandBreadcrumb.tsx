import { Button } from '@/shared/ui/atoms/button.atom';
import { PiCaretLeft, PiCaretRight } from 'react-icons/pi';
import type { NavigationCommand } from '../types';

interface CommandBreadcrumbProps {
  commandStack: NavigationCommand[];
  onBack: () => void;
  onNavigateTo?: (index: number) => void;
}

export function CommandBreadcrumb({ commandStack, onBack, onNavigateTo }: CommandBreadcrumbProps) {
  if (commandStack.length === 0) return null;

  const handleBreadcrumbClick = (index: number) => {
    if (onNavigateTo && index < commandStack.length - 1) {
      // Navigate back to the clicked breadcrumb level
      onNavigateTo(index);
    }
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center border-border-subtle border-b bg-surface-raised/70 px-4 py-2.5">
      <Button
        appearance="ghost"
        size="sm"
        onClick={onBack}
        aria-label="Zurück zur vorherigen Ebene"
        className="mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-text-secondary transition-colors hover:bg-action-secondary hover:text-text-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
      >
        <PiCaretLeft className="h-4 w-4" />
        <span className="font-medium">Zurück</span>
      </Button>

      <ol className="flex list-none items-center">
        {commandStack.map((cmd, idx) => {
          const isLast = idx === commandStack.length - 1;
          const isClickable = !isLast && onNavigateTo;

          return (
            <li key={cmd.id} className="flex items-center">
              {idx > 0 && <PiCaretRight className="mx-1 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(idx)}
                disabled={!isClickable}
                aria-current={isLast ? 'page' : undefined}
                className={`rounded-md px-2 py-1 font-medium text-sm transition-all focus-visible:outline-none focus-visible:shadow-focus-ring ${
                  isLast
                    ? 'cursor-default text-text-primary'
                    : isClickable
                      ? 'cursor-pointer text-text-secondary hover:bg-action-secondary hover:text-text-primary'
                      : 'cursor-default text-text-secondary'
                }
                `}
              >
                {cmd.name}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
