/**
 * TimeInput Molecule
 *
 * Zeit-Eingabe Komponente mit zwei Feldern für Stunden und Minuten.
 *
 * **Story 1.2 AC2:**
 * - Time-Picker zeigt Stunden (00-23) und Minuten (00-59)
 * - Input-Verhalten: Nur Zahlen erlauben, Auto-Tab bei 2 Ziffern
 * - Dark Mode Support mit Tailwind
 * - Keyboard Navigation: Tab zwischen Feldern
 */

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/shared/ui/cn';
import type { CustomTime } from '@/features/reminders';

interface TimeInputProps {
  /** Aktueller Zeitwert */
  value: CustomTime;
  /** Callback bei Änderung */
  onChange: (value: CustomTime) => void;
  /** Deaktiviert die Eingabe */
  disabled?: boolean;
  /** Zeigt Fehler-Styling */
  error?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** ID für A11y Label-Verknüpfung */
  id?: string;
}

/**
 * Zeit-Eingabe mit Stunden und Minuten Feldern.
 *
 * @example
 * ```tsx
 * <TimeInput
 *   value={{ hours: 14, minutes: 30 }}
 *   onChange={(time) => console.log(time)}
 * />
 * ```
 */
export function TimeInput({ value, onChange, disabled = false, error = false, className, id }: TimeInputProps) {
  const minutesRef = useRef<HTMLInputElement>(null);

  // Lokaler State für Eingabe während Focus - erlaubt leere Felder
  const [hoursInput, setHoursInput] = useState<string | null>(null);
  const [minutesInput, setMinutesInput] = useState<string | null>(null);

  const baseInputStyles = cn(
    'w-14 rounded-control border bg-surface-panel px-2 py-2.5 text-center font-medium text-text-primary transition-colors duration-200',
    'focus:outline-none focus-visible:shadow-focus-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
    error ? 'border-status-danger-border hover:border-status-danger-text focus:border-status-danger-text' : 'border-border-subtle hover:border-border-strong focus:border-action-primary',
  );

  const handleHoursChange = useCallback(
    (inputValue: string) => {
      // Nur Zahlen erlauben
      const numericValue = inputValue.replace(/\D/g, '');

      // Lokalen Input-State aktualisieren (erlaubt leere Eingabe)
      setHoursInput(numericValue);

      // Nur an Parent weitergeben wenn nicht leer
      if (numericValue !== '') {
        let hours = Number.parseInt(numericValue, 10);
        hours = Math.min(23, Math.max(0, hours));
        onChange({ ...value, hours });

        // Auto-Tab zu Minuten nach 2 Ziffern
        if (numericValue.length >= 2) {
          minutesRef.current?.focus();
          minutesRef.current?.select();
        }
      }
    },
    [value, onChange],
  );

  const handleMinutesChange = useCallback(
    (inputValue: string) => {
      // Nur Zahlen erlauben
      const numericValue = inputValue.replace(/\D/g, '');

      // Lokalen Input-State aktualisieren (erlaubt leere Eingabe)
      setMinutesInput(numericValue);

      // Nur an Parent weitergeben wenn nicht leer
      if (numericValue !== '') {
        let minutes = Number.parseInt(numericValue, 10);
        minutes = Math.min(59, Math.max(0, minutes));
        onChange({ ...value, minutes });
      }
    },
    [value, onChange],
  );

  const handleHoursFocus = useCallback(() => {
    // Bei Focus: Unformatiert anzeigen (ohne führende Null bei einstellig)
    setHoursInput(value.hours.toString());
  }, [value.hours]);

  const handleMinutesFocus = useCallback(() => {
    setMinutesInput(value.minutes.toString());
  }, [value.minutes]);

  const handleHoursBlur = useCallback(() => {
    // Bei Blur: Wenn leer, auf 0 setzen
    if (hoursInput === '' || hoursInput === null) {
      onChange({ ...value, hours: 0 });
    }
    // Lokalen State zurücksetzen → formatierte Anzeige
    setHoursInput(null);
  }, [hoursInput, value, onChange]);

  const handleMinutesBlur = useCallback(() => {
    if (minutesInput === '' || minutesInput === null) {
      onChange({ ...value, minutes: 0 });
    }
    setMinutesInput(null);
  }, [minutesInput, value, onChange]);

  // Display-Wert: Lokaler Input während Focus, sonst formatiert
  const displayHours = hoursInput !== null ? hoursInput : value.hours.toString().padStart(2, '0');
  const displayMinutes = minutesInput !== null ? minutesInput : value.minutes.toString().padStart(2, '0');

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        aria-label="Stunden"
        placeholder="HH"
        className={baseInputStyles}
        value={displayHours}
        onChange={(e) => handleHoursChange(e.target.value)}
        onFocus={handleHoursFocus}
        onBlur={handleHoursBlur}
        disabled={disabled}
      />
      <span className="text-lg font-medium text-text-muted">:</span>
      <input
        ref={minutesRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        aria-label="Minuten"
        placeholder="MM"
        className={baseInputStyles}
        value={displayMinutes}
        onChange={(e) => handleMinutesChange(e.target.value)}
        onFocus={handleMinutesFocus}
        onBlur={handleMinutesBlur}
        disabled={disabled}
      />
    </div>
  );
}
