/**
 * EinsatzPersonenPicker - Person-Auswahl via Combobox
 *
 * Wiederverwendbare Komponente fuer die Auswahl von registrierten Einsatz-Personen.
 * Nutzt den existierenden useEinsatzPersonen Hook (DRY Principle) und die
 * Headless Combobox fuer konsistentes UI-Verhalten.
 *
 * **Story TD2-Person-Picker:**
 * - AC2: EinsatzPersonenPicker Komponente
 * - Verwendet existierende Infrastruktur (Hook + Combobox)
 * - Client-seitige Filterung (Case-insensitive auf vorname + nachname)
 * - Loading, Error, Empty States abgedeckt
 * - Keyboard Navigation via Headless UI (Arrow, Enter, Escape)
 *
 * @module features/kraefte/ui/molecules
 */

import { useMemo } from 'react';

import { Combobox, type ComboboxItem } from '@/shared/ui/headless/combobox';

import { useEinsatzPersonen } from '../../api';

interface EinsatzPersonenPickerProps {
  /** CUID2 des Einsatzes */
  einsatzId: string;
  /** Aktuell ausgewaehlte einsatzPersonId */
  value: string;
  /** Callback wenn eine Person ausgewaehlt wird */
  onChange: (personId: string) => void;
  /** Callback bei Blur Event */
  onBlur?: () => void;
  /** Deaktiviert das Picker-Input */
  disabled?: boolean;
  /** Fehler-Nachricht (wird unter dem Input angezeigt) */
  error?: string;
  /** Label ueber dem Input */
  label?: string;
  /** Placeholder-Text im Input */
  placeholder?: string;
  /** IDs von Personen die ausgefiltert werden sollen (z.B. bereits besetzt) */
  excludePersonIds?: string[];
}

/**
 * Person-Picker fuer Einsatz-Personen mit Autocomplete.
 *
 * Laedt alle registrierten Personen des Einsatzes und ermoeglicht
 * die Auswahl via Combobox mit client-seitiger Filterung.
 *
 * Keyboard Navigation: Arrow Keys zum Navigieren, Enter zum Auswaehlen, Escape zum Schliessen.
 */
export function EinsatzPersonenPicker({ einsatzId, value, onChange, onBlur, disabled, error, label = 'Person', placeholder = 'Person suchen...', excludePersonIds = [] }: EinsatzPersonenPickerProps) {
  const { data: personen, isLoading, isError } = useEinsatzPersonen(einsatzId);

  const items: ComboboxItem[] = useMemo(() => {
    if (!personen) return [];

    return personen
      .filter((p) => !excludePersonIds.includes(p.id))
      .map((person) => ({
        value: person.id,
        label: person.funkrufname ? `${person.vorname} ${person.nachname} (${person.funkrufname})` : `${person.vorname} ${person.nachname}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'de'));
  }, [personen, excludePersonIds]);

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-1">
        {label && <div className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />}
        <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="space-y-1">
        {label && <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">{label}</span>}
        <div role="alert" aria-live="assertive" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          Fehler beim Laden der Personen. Bitte Seite neu laden.
        </div>
      </div>
    );
  }

  // Empty State (keine Personen registriert)
  if (personen && personen.length === 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">{label}</span>}
        <output className="block rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-700 text-sm dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          Keine Personen registriert. Registrieren Sie zuerst Einsatzkraefte.
        </output>
      </div>
    );
  }

  // All filtered out State
  if (items.length === 0 && personen && personen.length > 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">{label}</span>}
        <output className="block rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-600 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Alle verfuegbaren Personen sind bereits Rollen zugewiesen.
        </output>
      </div>
    );
  }

  return <Combobox label={label} items={items} value={value} onChange={onChange} onBlur={onBlur} disabled={disabled} error={error} placeholder={placeholder} openOnFocus />;
}
