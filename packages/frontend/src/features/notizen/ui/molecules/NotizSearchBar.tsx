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
      <PiMagnifyingGlass aria-hidden="true" className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-text-muted" />
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
          'rounded-control border border-border-subtle bg-surface-panel text-text-primary',
          'focus:border-action-primary focus:outline-none focus-visible:shadow-focus-ring',
          'placeholder:text-text-muted',
        )}
      />
      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
        {showResultCount && (
          <output className="text-text-muted text-xs" aria-live="polite">
            {resultCount} von {totalCount}
          </output>
        )}
        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Suche zurücksetzen"
            className="rounded-control text-text-muted hover:text-text-secondary focus:outline-none focus-visible:shadow-focus-ring"
          >
            <PiX aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
