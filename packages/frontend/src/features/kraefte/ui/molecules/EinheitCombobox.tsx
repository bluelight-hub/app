/**
 * EinheitCombobox - Auswahl einer taktischen Einheit via Combobox.
 *
 * Wiederverwendbare Single-Select-Komponente fuer die Auswahl einer
 * Einsatz-Einheit. Orientiert sich strukturell am EinsatzPersonenPicker
 * und nutzt die generische `Combobox` aus `shared/ui/headless`.
 *
 * Label-Format: "Name (Typ)" — z.B. "RTW 1 (Trupp)".
 *
 * @module features/kraefte/ui/molecules
 */

import { Combobox, type ComboboxItem } from '@/shared/ui/headless/combobox';
import { useMemo } from 'react';

import { useEinsatzEinheiten } from '../../api';

const TYP_LABEL: Record<string, string> = {
  TRUPP: 'Trupp',
  STAFFEL: 'Staffel',
  GRUPPE: 'Gruppe',
  ZUG: 'Zug',
  VERBAND: 'Verband',
  ABSCHNITT: 'Abschnitt',
  SONSTIGE: 'Sonstige',
};

export interface EinheitComboboxProps {
  /** CUID2 des Einsatzes */
  einsatzId: string;
  /** Aktuell ausgewählte Einheit-ID. Leerer String = keine Auswahl. */
  value: string;
  /** Callback bei Auswahl. Leerer String bedeutet "geleert" (nur sinnvoll mit allowEmpty). */
  onChange: (einheitId: string) => void;
  /** Callback bei Blur (z.B. fuer Form-Integration) */
  onBlur?: () => void;
  /** Deaktiviert die Combobox */
  disabled?: boolean;
  /** Fehler-Nachricht (wird unter dem Input angezeigt) */
  error?: string;
  /** Label über dem Input. Default: "Einheit". */
  label?: string;
  /** Placeholder im Input */
  placeholder?: string;
  /**
   * Erlaubt das Leeren der Auswahl (Clear-Button). Wenn `false`, wird
   * der Empty-/Error-State so dargestellt, dass kein Eingabefeld erscheint,
   * solange keine Optionen verfügbar sind.
   */
  allowEmpty?: boolean;
  /** Einheit-IDs, die ausgefiltert werden sollen (z.B. bereits zugewiesen) */
  excludeEinheitIds?: string[];
}

/**
 * Single-Select Combobox für taktische Einsatz-Einheiten.
 *
 * Lädt alle Einheiten des Einsatzes via `useEinsatzEinheiten` und ermöglicht
 * die Auswahl mit client-seitiger Filterung. Keyboard-Navigation via Headless UI.
 */
export function EinheitCombobox({
  einsatzId,
  value,
  onChange,
  onBlur,
  disabled,
  error,
  label = 'Einheit',
  placeholder = 'Einheit suchen…',
  allowEmpty = false,
  excludeEinheitIds = [],
}: EinheitComboboxProps) {
  const { data: einheiten, isLoading, isError } = useEinsatzEinheiten(einsatzId);

  const items: ComboboxItem[] = useMemo(() => {
    if (!einheiten) return [];

    return einheiten
      .filter((e) => !excludeEinheitIds.includes(e.id))
      .map((einheit) => ({
        value: einheit.id,
        label: `${einheit.name} (${TYP_LABEL[einheit.typ] ?? einheit.typ})`,
        meta: { typ: einheit.typ },
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'de'));
  }, [einheiten, excludeEinheitIds]);

  if (isLoading) {
    return (
      <div className="space-y-1">
        {label && <div className="h-5 w-16 animate-pulse rounded bg-surface-raised" />}
        <div className="h-10 animate-pulse rounded-control bg-surface-raised" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <div role="alert" aria-live="assertive" className="rounded-panel border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
          Einheiten konnten nicht geladen werden — bitte erneut versuchen.
        </div>
      </div>
    );
  }

  if (einheiten && einheiten.length === 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <output className="block rounded-panel border border-status-warning-border bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text">Dieser Einsatz hat keine Einheiten.</output>
      </div>
    );
  }

  if (items.length === 0 && einheiten && einheiten.length > 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <output className="block rounded-panel border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-secondary">Alle verfügbaren Einheiten sind bereits zugewiesen.</output>
      </div>
    );
  }

  return (
    <Combobox
      label={label}
      items={items}
      value={value}
      onChange={(next) => {
        if (next === '' && !allowEmpty) {
          return;
        }
        onChange(next);
      }}
      onBlur={onBlur}
      disabled={disabled}
      error={error}
      placeholder={placeholder}
      openOnFocus
    />
  );
}
