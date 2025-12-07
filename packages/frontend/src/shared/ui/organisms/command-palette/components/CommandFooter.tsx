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
  // Default shortcuts fallback
  const defaultShortcuts = {
    navigate: ['↑↓'],
    select: ['↵'],
    toggle: ['ESC'],
  };

  // Merge with defaults to ensure we always have values
  const safeShortcuts = {
    navigate: shortcuts?.navigate || defaultShortcuts.navigate,
    select: shortcuts?.select || defaultShortcuts.select,
    toggle: shortcuts?.toggle || defaultShortcuts.toggle,
  };

  // Define shortcut labels
  const shortcutLabels = {
    navigate: 'navigieren',
    select: 'auswählen',
    toggle: 'schließen',
  };

  return (
    <div className="border-gray-200 border-t bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-gray-500 text-xs dark:text-gray-400">
          {Object.entries(safeShortcuts).map(([key, keys]) => {
            if (!keys || keys.length === 0) return null;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <kbd className={commandItemClasses.kbd}>{Array.isArray(keys) ? keys.join('') : keys}</kbd>
                <span>{shortcutLabels[key as keyof typeof shortcutLabels]}</span>
              </div>
            );
          })}
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
