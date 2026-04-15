import { Input } from '@/shared/ui/atoms/input.atom';
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
    <Input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      fullWidth
      leftIcon={<PiMagnifyingGlass className="h-4 w-4" />}
    />
  );
}
