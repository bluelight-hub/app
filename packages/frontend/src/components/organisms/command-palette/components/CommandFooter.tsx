import { commandItemClasses } from '../utils';

interface CommandFooterProps {
  resultCount?: number;
  shortcuts: {
    navigate: string[];
    select: string[];
    toggle?: string[];
  };
}

export function CommandFooter({ resultCount, shortcuts }: CommandFooterProps) {
  return (
    <div className="border-gray-200 border-t bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-gray-500 text-xs dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <kbd className={commandItemClasses.kbd}>↑↓</kbd>
            <span>navigieren</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className={commandItemClasses.kbd}>↵</kbd>
            <span>auswählen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className={commandItemClasses.kbd}>ESC</kbd>
            <span>schließen</span>
          </div>
        </div>
        {resultCount !== undefined && resultCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs dark:text-gray-500">{resultCount} Ergebnisse</span>
          </div>
        )}
      </div>
    </div>
  );
}
