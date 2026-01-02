/**
 * RollenDefinitionenPicker - Rollen-Auswahl via Combobox.
 *
 * Bietet eine suchbare Liste aller aktiven RollenDefinitionen und filtert
 * optional bereits besetzte Rollen aus.
 */

import { useMemo } from 'react';

import { Combobox, type ComboboxItem } from '@/shared/ui/headless/combobox';

import { useRollenDefinitionen } from '../../api';

interface RollenDefinitionenPickerProps {
  /** Aktuell ausgewaehlte RollenDefinition-ID */
  value: string;
  /** Callback wenn eine Rolle ausgewaehlt wird */
  onChange: (rollenDefinitionId: string) => void;
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
  /** IDs von Rollen die ausgefiltert werden sollen (z.B. bereits besetzt) */
  excludeRollenDefinitionIds?: string[];
}

export function RollenDefinitionenPicker({
  value,
  onChange,
  onBlur,
  disabled,
  error,
  label = 'Rolle',
  placeholder = 'Rolle suchen...',
  excludeRollenDefinitionIds = [],
}: RollenDefinitionenPickerProps) {
  const { data: rollen, isLoading, isError } = useRollenDefinitionen();

  const items: ComboboxItem[] = useMemo(() => {
    if (!rollen) return [];

    return rollen
      .filter((rolle) => !excludeRollenDefinitionIds.includes(rolle.id))
      .map((rolle) => ({
        value: rolle.id,
        label: rolle.funkrufname ? `${rolle.name} (${rolle.funkrufname})` : rolle.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'de'));
  }, [rollen, excludeRollenDefinitionIds]);

  if (isLoading) {
    return (
      <div className="space-y-1">
        {label && <div className="h-5 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />}
        <div className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-1">
        {label && <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">{label}</span>}
        <div role="alert" aria-live="assertive" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          Fehler beim Laden der Rollen. Bitte Seite neu laden.
        </div>
      </div>
    );
  }

  if (rollen && rollen.length === 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">{label}</span>}
        <output className="block rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-700 text-sm dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          Keine RollenDefinitionen gefunden. Bitte Rollen anlegen.
        </output>
      </div>
    );
  }

  if (items.length === 0 && rollen && rollen.length > 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block font-medium text-gray-700 text-sm dark:text-gray-300">{label}</span>}
        <output className="block rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-600 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Alle Rollen sind bereits besetzt.
        </output>
      </div>
    );
  }

  return <Combobox label={label} items={items} value={value} onChange={onChange} onBlur={onBlur} disabled={disabled} error={error} placeholder={placeholder} openOnFocus />;
}
