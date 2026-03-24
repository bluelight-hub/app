import { cn } from '@/shared/ui/cn';
import { PiMagnifyingGlass } from 'react-icons/pi';

interface EtbSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * ETB Suchfeld-Komponente
 */
export function EtbSearchBar({ value, onChange, placeholder = 'Einträge durchsuchen...' }: EtbSearchBarProps) {
  return (
    <div className="relative">
      <PiMagnifyingGlass className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-text-muted" />
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={cn(
          'w-full py-2 pr-4 pl-9 text-sm',
          'rounded-lg border border-border-subtle bg-surface-panel text-text-primary',
          'placeholder:text-text-muted',
          'focus-visible:border-action-primary focus-visible:outline-none focus-visible:shadow-focus-ring',
        )}
      />
    </div>
  );
}
