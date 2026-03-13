import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { debounce } from '@tanstack/pacer';
import { forwardRef, useCallback, useEffect, useState } from 'react';
import { PiMagnifyingGlass, PiX } from 'react-icons/pi';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  placeholder?: string;
  delay?: number;
  showSearchIcon?: boolean;
  showClearButton?: boolean;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Suchfeld-Komponente mit eingebautem Debouncing
 *
 * @param value - Kontrollierter Wert (optional)
 * @param onChange - Sofortige Änderung (für UI-Updates)
 * @param onDebouncedChange - Verzögerte Änderung (für API-Calls)
 * @param delay - Debounce-Verzögerung in ms (Standard: 300)
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value: controlledValue, onChange, onDebouncedChange, placeholder = 'Suchen...', delay = 300, showSearchIcon = true, showClearButton = true, className, autoFocus, disabled }, ref) => {
    const [localValue, setLocalValue] = useState(controlledValue || '');

    // Create debounced callback for search
    const debouncedSearch = useCallback(
      debounce(
        (value: string) => {
          if (onDebouncedChange) {
            onDebouncedChange(value);
          }
        },
        { wait: delay },
      ),
      [], // Empty deps since debounce creates stable function
    );

    // Sync mit kontrolliertem Wert
    useEffect(() => {
      if (controlledValue !== undefined && controlledValue !== localValue) {
        setLocalValue(controlledValue);
      }
    }, [controlledValue, localValue]);

    // Trigger debounced callback when local value changes
    useEffect(() => {
      debouncedSearch(localValue);
    }, [localValue, debouncedSearch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Sofortiges Callback für UI-Updates
      if (onChange) {
        onChange(newValue);
      }
    };

    const handleClear = () => {
      setLocalValue('');
      if (onChange) {
        onChange('');
      }
      if (onDebouncedChange) {
        onDebouncedChange('');
      }
    };

    return (
      <div className="relative">
        {showSearchIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <PiMagnifyingGlass className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          </div>
        )}

        <Input
          ref={ref}
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            '!rounded-2xl h-11 border-slate-200 bg-white text-slate-900 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)] transition focus-visible:border-sky-500 focus-visible:ring-sky-500/35 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100',
            showSearchIcon && 'pl-10',
            showClearButton && localValue && 'pr-10',
            className,
          )}
          autoFocus={autoFocus}
          disabled={disabled}
        />

        {showClearButton && localValue && !disabled && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            className="!rounded-full absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
            aria-label="Suche löschen"
          >
            <PiX className="h-5 w-5" />
          </Button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
