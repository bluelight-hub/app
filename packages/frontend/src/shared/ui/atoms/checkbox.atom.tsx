import { Checkbox as HeadlessCheckbox } from '@headlessui/react';
import { PiCheck } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

export interface CheckboxProps {
  /**
   * Der aktuelle Zustand der Checkbox.
   */
  checked: boolean;
  /**
   * Callback, der aufgerufen wird, wenn sich der Zustand ändert.
   */
  onChange: (checked: boolean) => void;
  /**
   * Optionale ID für Accessibility-Verknüpfung mit Label.
   */
  id?: string;
  /**
   * Name für das Formularfeld.
   */
  name?: string;
  /**
   * Deaktiviert die Checkbox.
   */
  disabled?: boolean;
  /**
   * Zusätzliche CSS-Klassen.
   */
  className?: string;
}

/**
 * Checkbox Component.
 *
 * Wrapper um Headless UI Checkbox mit konsistentem Styling.
 */
export const Checkbox = ({ checked, onChange, id, name, disabled = false, className }: CheckboxProps) => {
  return (
    <HeadlessCheckbox
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      id={id}
      name={name}
      className={cn(
        'group flex h-4 w-4 items-center justify-center rounded border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800',
        'data-[checked]:border-blue-600 data-[checked]:bg-blue-600',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <PiCheck className="hidden h-3.5 w-3.5 text-white group-data-[checked]:block" strokeWidth={3} />
    </HeadlessCheckbox>
  );
};
