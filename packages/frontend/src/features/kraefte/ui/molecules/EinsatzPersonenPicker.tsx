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

import { Combobox, type ComboboxItem } from '@/shared/ui/headless/combobox';
import { useMemo } from 'react';

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
        {label && <div className="h-5 w-16 animate-pulse rounded bg-surface-raised" />}
        <div className="h-10 animate-pulse rounded-control bg-surface-raised" />
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <div role="alert" aria-live="assertive" className="rounded-panel border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
          Fehler beim Laden der Personen. Bitte Seite neu laden.
        </div>
      </div>
    );
  }

  // Empty State (keine Personen registriert)
  if (personen && personen.length === 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <output className="block rounded-panel border border-status-warning-border bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text">
          Keine Personen registriert. Registrieren Sie zuerst Einsatzkräfte.
        </output>
      </div>
    );
  }

  // All filtered out State
  if (items.length === 0 && personen && personen.length > 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <output className="block rounded-panel border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-secondary">Alle verfügbaren Personen sind bereits Rollen zugewiesen.</output>
      </div>
    );
  }

  return <Combobox label={label} items={items} value={value} onChange={onChange} onBlur={onBlur} disabled={disabled} error={error} placeholder={placeholder} openOnFocus />;
}
