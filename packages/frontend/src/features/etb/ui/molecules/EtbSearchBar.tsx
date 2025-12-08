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
      <PiMagnifyingGlass className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full py-2 pr-4 pl-9 text-sm',
          'rounded-lg border border-gray-300',
          'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
          'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
          'placeholder:text-gray-400',
        )}
      />
    </div>
  );
}
