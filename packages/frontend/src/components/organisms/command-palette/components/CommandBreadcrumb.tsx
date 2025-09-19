import { Button } from '@atoms/button.atom';
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
    <nav aria-label="Breadcrumb" className="flex items-center border-gray-200 border-b bg-gray-50/50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/30">
      <Button
        appearance="ghost"
        size="sm"
        onClick={onBack}
        aria-label="Zurück zur vorherigen Ebene"
        className="mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
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
              {idx > 0 && <PiCaretRight className="mx-1 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(idx)}
                disabled={!isClickable}
                aria-current={isLast ? 'page' : undefined}
                className={`rounded-md px-2 py-1 font-medium text-sm transition-all ${
                  isLast
                    ? 'cursor-default text-gray-900 dark:text-gray-100'
                    : isClickable
                      ? 'cursor-pointer text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                      : 'cursor-default text-gray-600 dark:text-gray-400'
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
