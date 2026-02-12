import { cn } from '@/shared/ui/cn';
import { PiMagnifyingGlass, PiX } from 'react-icons/pi';

interface NotizSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  resultCount?: number;
  totalCount?: number;
}

export function NotizSearchBar({ value, onChange, onClear, resultCount, totalCount }: NotizSearchBarProps) {
  const hasValue = value.length > 0;
  const showResultCount = resultCount !== undefined && hasValue;

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="notiz-search">
        Notizen durchsuchen
      </label>
      <PiMagnifyingGlass aria-hidden="true" className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
      <input
        id="notiz-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Notizen durchsuchen..."
        aria-label="Notizen durchsuchen"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={cn(
          'w-full py-2 pl-9 text-sm',
          showResultCount || hasValue ? 'pr-24' : 'pr-4',
          'rounded-lg border border-gray-300',
          'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
          'placeholder:text-gray-400',
        )}
      />
      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
        {showResultCount && (
          <output className="text-gray-400 text-xs" aria-live="polite">
            {resultCount} von {totalCount}
          </output>
        )}
        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Suche zurücksetzen"
            className="rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:text-gray-200"
          >
            <PiX aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
