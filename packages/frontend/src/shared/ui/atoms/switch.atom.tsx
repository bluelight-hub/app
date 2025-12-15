import { Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from '@/shared/ui/cn';

export interface SwitchProps {
  /**
   * Der aktuelle Zustand des Switch.
   */
  checked: boolean;
  /**
   * Callback, der aufgerufen wird, wenn sich der Zustand ändert.
   */
  onChange: (checked: boolean) => void;
  /**
   * Optionale Label-ID für Accessibility.
   */
  labelledBy?: string;
  /**
   * Optionale Beschreibung des Switch für Accessibility.
   */
  description?: string;
  /**
   * Deaktiviert den Switch.
   */
  disabled?: boolean;
  /**
   * Zusätzliche CSS-Klassen.
   */
  className?: string;
}

/**
 * Switch Toggle Component.
 *
 * Wrapper um Headless UI Switch mit konsistentem Styling.
 */
export const Switch = ({ checked, onChange, labelledBy, description, disabled = false, className }: SwitchProps) => {
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-labelledby={labelledBy}
      aria-describedby={description}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </HeadlessSwitch>
  );
};
