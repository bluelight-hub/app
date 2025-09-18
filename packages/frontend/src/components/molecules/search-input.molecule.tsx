import { useDebouncedState } from '@/hooks/useDebounce';
import { Button } from '@atoms/button.atom';
import { Input } from '@atoms/input.atom';
import { forwardRef, useEffect } from 'react';
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
    const [localValue, debouncedValue, setLocalValue] = useDebouncedState(controlledValue || '', delay);

    // Sync mit kontrolliertem Wert
    useEffect(() => {
      if (controlledValue !== undefined && controlledValue !== localValue) {
        setLocalValue(controlledValue);
      }
    }, [controlledValue, localValue, setLocalValue]);

    // Debounced Callback
    useEffect(() => {
      if (onDebouncedChange) {
        onDebouncedChange(debouncedValue);
      }
    }, [debouncedValue, onDebouncedChange]);

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
            <PiMagnifyingGlass className="h-5 w-5 text-gray-400" />
          </div>
        )}

        <Input
          ref={ref}
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`${showSearchIcon ? 'pl-10' : ''} ${showClearButton && localValue ? 'pr-10' : ''} ${className || ''}`}
          autoFocus={autoFocus}
          disabled={disabled}
        />

        {showClearButton && localValue && !disabled && (
          <Button
            appearance="minimal"
            size="icon"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
