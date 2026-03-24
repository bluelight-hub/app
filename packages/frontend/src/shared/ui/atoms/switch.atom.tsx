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
        'relative inline-flex h-5 w-9 items-center rounded-pill transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none',
        checked ? 'bg-action-primary' : 'bg-surface-raised',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-surface-panel transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </HeadlessSwitch>
  );
};
