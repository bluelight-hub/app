import { Input } from '@/shared/ui/atoms/input.atom';
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
      <Input
        id="notiz-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Notizen durchsuchen..."
        aria-label="Notizen durchsuchen"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        fullWidth
        leftIcon={<PiMagnifyingGlass aria-hidden="true" className="h-4 w-4" />}
      />
      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
        {showResultCount && (
          <output className="text-xs text-text-muted" aria-live="polite">
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
