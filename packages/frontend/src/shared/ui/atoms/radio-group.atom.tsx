import { Radio as HeadlessRadio, RadioGroup as HeadlessRadioGroup, Field, Label } from '@headlessui/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/ui/cn';

/**
 * Eine einzelne Auswahloption innerhalb der {@link RadioGroup}.
 *
 * `value` ist der technische Wert, `label` der sichtbare Titel; `description`
 * und `icon` werden nur von der Card-Variante gerendert.
 */
export interface RadioOption<TValue extends string = string> {
  value: TValue;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * Props für {@link RadioGroup}.
 *
 * Die Komponente unterstützt zwei Layout-Varianten:
 * - `inline` (Default): kompakte Radio-Punkte neben Text, ideal für Filter.
 * - `card`: ausgefüllte Karten mit Border, Icon und Beschreibung — ideal
 *   für Dialoge mit erklärungsbedürftigen Optionen.
 */
export interface RadioGroupProps<TValue extends string = string> {
  value: TValue;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<RadioOption<TValue>>;
  /**
   * Visuelles Layout. `inline` rendert kleine Radio-Punkte in einer Reihe,
   * `card` rendert gefüllte Karten mit Hover- und Selected-State.
   */
  variant?: 'inline' | 'card';
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  name?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

const DOT_BASE =
  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors border-border-subtle bg-surface-panel focus-visible:shadow-focus-ring focus-visible:outline-none data-[checked]:border-action-primary data-[checked]:bg-action-primary';
const DOT_INNER = 'hidden h-1.5 w-1.5 rounded-full bg-text-inverse group-data-[checked]:block';

const CARD_BASE = 'group flex cursor-pointer items-start gap-3 rounded-panel border p-3 transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none';
const CARD_UNSELECTED = 'border-border-subtle bg-surface-panel hover:border-border-strong hover:bg-action-secondary';
const CARD_SELECTED = 'data-[checked]:border-action-primary data-[checked]:bg-action-secondary';

/**
 * RadioGroup Atom auf Basis von Headless UI.
 *
 * - Tastatur-Navigation (Pfeiltasten) und Focus-Management kommen von Headless UI.
 * - Klicks auf Label und Beschreibung toggeln zuverlässig (Field/Label-Pattern).
 *
 * @example Inline
 * ```tsx
 * <RadioGroup
 *   value={type}
 *   onChange={setType}
 *   aria-label="Kanaltyp"
 *   options={[
 *     { value: 'tmo', label: 'TMO' },
 *     { value: 'dmo', label: 'DMO' },
 *     { value: 'analog', label: 'Analog' },
 *   ]}
 * />
 * ```
 *
 * @example Card
 * ```tsx
 * <RadioGroup
 *   variant="card"
 *   value={format}
 *   onChange={setFormat}
 *   options={[
 *     { value: 'csv', label: 'CSV', description: 'Tabellenkalkulation', icon: <PiFileCsv /> },
 *     { value: 'pdf', label: 'PDF', description: 'Druckfertiges Dokument', icon: <PiFilePdf /> },
 *   ]}
 * />
 * ```
 */
export function RadioGroup<TValue extends string = string>({
  value,
  onChange,
  options,
  variant = 'inline',
  orientation = variant === 'card' ? 'vertical' : 'horizontal',
  disabled,
  name,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: RadioGroupProps<TValue>) {
  const isCard = variant === 'card';

  return (
    <HeadlessRadioGroup
      value={value}
      onChange={onChange}
      disabled={disabled}
      name={name}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(orientation === 'vertical' ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-3', className)}
    >
      {options.map((option) => {
        const itemDisabled = disabled || option.disabled;
        return (
          <Field key={option.value} disabled={itemDisabled} className={cn('group', itemDisabled && 'cursor-not-allowed opacity-50')}>
            <HeadlessRadio
              value={option.value}
              disabled={itemDisabled}
              className={cn(isCard ? cn(CARD_BASE, CARD_UNSELECTED, CARD_SELECTED) : 'inline-flex cursor-pointer items-center gap-2', itemDisabled && 'cursor-not-allowed')}
            >
              <span className={DOT_BASE}>
                <span className={DOT_INNER} />
              </span>
              {isCard ? (
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-text-primary group-data-[checked]:text-action-primary">
                    {option.icon}
                    <Label as="span" className="select-none">
                      {option.label}
                    </Label>
                  </span>
                  {option.description && <span className="text-xs text-text-muted">{option.description}</span>}
                </span>
              ) : (
                <Label as="span" className="text-sm text-text-primary select-none">
                  {option.label}
                </Label>
              )}
            </HeadlessRadio>
          </Field>
        );
      })}
    </HeadlessRadioGroup>
  );
}
