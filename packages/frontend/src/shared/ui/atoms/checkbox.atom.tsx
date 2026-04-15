import { Field, Checkbox as HeadlessCheckbox, Label } from '@headlessui/react';
import type { ReactNode } from 'react';
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
   * Zusätzliche CSS-Klassen für die Checkbox selbst.
   */
  className?: string;
  /**
   * Optionaler Label-Inhalt. Wenn gesetzt, rendert die Komponente ein
   * Headless-UI-`Field` mit `Label`; Klicks auf den Label-Text toggeln
   * die Checkbox automatisch.
   */
  label?: ReactNode;
  /**
   * Zusätzliche CSS-Klassen für den Label-Text (nur wirksam mit `label`).
   */
  labelClassName?: string;
  /**
   * Zusätzliche CSS-Klassen für den Field-Container (nur wirksam mit `label`).
   */
  containerClassName?: string;
  /**
   * Zugänglicher Name, falls kein Textlabel im DOM mit der Checkbox verknüpft ist.
   * Wird ignoriert, wenn `label` gesetzt ist (dann übernimmt `Label` die Verknüpfung).
   */
  'aria-label'?: string;
  /**
   * ID(s) eines oder mehrerer Elemente, deren Text als zugänglicher Name dient.
   */
  'aria-labelledby'?: string;
  /**
   * ID(s) eines oder mehrerer Elemente, deren Text als zusätzliche Beschreibung dient.
   */
  'aria-describedby'?: string;
}

/**
 * Checkbox Component.
 *
 * Wrapper um Headless UI Checkbox mit konsistentem Styling. Wenn `label`
 * gesetzt ist, wird die Checkbox in ein `Field` mit `Label` eingebettet —
 * Klicks auf den Label-Text toggeln die Checkbox.
 */
export const Checkbox = ({
  checked,
  onChange,
  id,
  name,
  disabled = false,
  className,
  label,
  labelClassName,
  containerClassName,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: CheckboxProps) => {
  const box = (
    <HeadlessCheckbox
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      id={id}
      name={name}
      aria-label={label === undefined ? ariaLabel : undefined}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'group flex h-4 w-4 shrink-0 items-center justify-center rounded-control border transition-colors',
        'border-border-subtle bg-surface-panel',
        'focus-visible:shadow-focus-ring focus-visible:outline-none',
        'data-[checked]:border-action-primary data-[checked]:bg-action-primary',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <PiCheck className="hidden h-3.5 w-3.5 text-text-inverse group-data-[checked]:block" strokeWidth={3} />
    </HeadlessCheckbox>
  );

  if (label === undefined) {
    return box;
  }

  const handleLabelClick = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <Field className={cn('inline-flex items-center gap-2', containerClassName)}>
      {box}
      <Label as="span" onClick={handleLabelClick} className={cn('select-none', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer', labelClassName)}>
        {label}
      </Label>
    </Field>
  );
};
