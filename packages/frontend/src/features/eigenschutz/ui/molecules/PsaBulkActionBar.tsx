import { Button } from '@/shared/ui/atoms/button.atom';

export interface PsaBulkActionBarProps {
  readonly selectionCount: number;
  readonly onChange: () => void;
  readonly onCancel: () => void;
}

/**
 * Sticky-Action-Bar für den Multi-Select-Modus auf der `PsaProfilePage`
 * (Story 3.2 AC2). Erscheint, sobald mindestens eine Karte markiert ist;
 * verschwindet, wenn die Selection auf 0 sinkt.
 *
 * **A11y:** `role="toolbar"` + `aria-label="Bulk-Aktionen"` (UX-Spec
 * Form-Pattern). Der Primary-Button trägt eine sprechende Inline-Beschriftung
 * mit `tabular-nums` für stabile Zahl-Darstellung.
 */
export function PsaBulkActionBar({ selectionCount, onChange, onCancel }: PsaBulkActionBarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Bulk-Aktionen"
      className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-subtle bg-surface-panel/95 px-3 py-2 shadow-panel backdrop-blur"
      data-testid="psa-bulk-action-bar"
    >
      <p className="text-sm font-medium text-text-primary">
        <span className="tabular-nums">{selectionCount}</span>
        {selectionCount === 1 ? ' Abschnitt ausgewählt' : ' Abschnitte ausgewählt'}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" intent="secondary" size="sm" onClick={onCancel} data-testid="psa-bulk-cancel">
          Abbrechen
        </Button>
        <Button type="button" intent="primary" size="sm" onClick={onChange} data-testid="psa-bulk-change">
          PSA ändern für {selectionCount} {selectionCount === 1 ? 'Abschnitt' : 'Abschnitte'}
        </Button>
      </div>
    </div>
  );
}
