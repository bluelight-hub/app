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
        {label && <div className="h-5 w-20 animate-pulse rounded bg-surface-raised" />}
        <div className="h-10 animate-pulse rounded-control bg-surface-raised" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <div role="alert" aria-live="assertive" className="rounded-panel border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
          Fehler beim Laden der Rollen. Bitte Seite neu laden.
        </div>
      </div>
    );
  }

  if (rollen && rollen.length === 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <output className="block rounded-panel border border-status-warning-border bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text">
          Keine RollenDefinitionen gefunden. Bitte Rollen anlegen.
        </output>
      </div>
    );
  }

  if (items.length === 0 && rollen && rollen.length > 0) {
    return (
      <div className="space-y-1">
        {label && <span className="block text-sm font-medium text-text-secondary">{label}</span>}
        <output className="block rounded-panel border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-secondary">Alle Rollen sind bereits besetzt.</output>
      </div>
    );
  }

  return <Combobox label={label} items={items} value={value} onChange={onChange} onBlur={onBlur} disabled={disabled} error={error} placeholder={placeholder} openOnFocus />;
}
