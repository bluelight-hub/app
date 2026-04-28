import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';
import { cn } from '@/shared/ui/cn';
import { type AusruestungsItem, getAusruestungsCheckliste } from '../../constants/ausruestungs-checkliste.constants';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';

export interface EquipmentChecklistEinheit {
  readonly einheitId: string;
  readonly einheitName: string;
  /** Bereits gemeldete Lücken-Notiz (Story 3.6) — leer in Story 3.5. */
  readonly luecke?: { readonly meldung: string; readonly gemeldetAm: string };
}

export interface EquipmentChecklistProps {
  readonly aktiveProfile: readonly PsaProfilValue[];
  readonly einheiten: readonly EquipmentChecklistEinheit[];
  /** Composite-Key Map: `${einheitId}|${itemId}` → boolean. */
  readonly checked: ReadonlyMap<string, boolean>;
  readonly onToggle: (einheitId: string, itemId: string, next: boolean) => void;
  /**
   * Story-3.6-Stub. Wenn gesetzt, ist der „Lücke melden"-Button enabled
   * und übergibt die vorbereitete Notiz aus den nicht-gehakten Items.
   */
  readonly onMeldeLuecke?: (input: { einheitId: string; vorbereiteteNotiz: string }) => void;
  readonly 'data-testid'?: string;
}

type EinheitStatus = 'pristine' | 'in-progress' | 'complete' | 'gap-reported';

const compositeKey = (einheitId: string, itemId: string): string => `${einheitId}|${itemId}`;

function aggregateItems(profile: readonly PsaProfilValue[]): readonly AusruestungsItem[] {
  const seen = new Set<string>();
  const result: AusruestungsItem[] = [];
  for (const profil of profile) {
    for (const item of getAusruestungsCheckliste(profil).items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

function computeStatus(einheit: EquipmentChecklistEinheit, allItems: readonly AusruestungsItem[], checked: ReadonlyMap<string, boolean>): EinheitStatus {
  if (einheit.luecke !== undefined) return 'gap-reported';
  if (allItems.length === 0) return 'pristine';
  let count = 0;
  for (const item of allItems) {
    if (checked.get(compositeKey(einheit.einheitId, item.id)) === true) count += 1;
  }
  if (count === 0) return 'pristine';
  if (count === allItems.length) return 'complete';
  return 'in-progress';
}

const STATUS_META: Record<EinheitStatus, { label: string; className: string }> = {
  pristine: { label: 'Noch nicht geprüft', className: 'border-border-subtle bg-surface-panel text-text-muted' },
  'in-progress': { label: 'Teilweise geprüft', className: 'border-status-warning-border bg-status-warning-surface text-status-warning-text' },
  complete: { label: 'Vollständig geprüft', className: 'border-status-success-border bg-status-success-surface text-status-success-text' },
  'gap-reported': { label: 'Lücke gemeldet', className: 'border-status-danger-border bg-status-danger-surface text-status-danger-text' },
};

/**
 * `EquipmentChecklist` — Ausrüstungs-Prüfung pro Einheit über alle aktiven
 * PSA-Profile (Story 3.5 AC5/AC8/AC10/AC12).
 *
 * **Layout:**
 * - Pro aktivem PSA-Profil eine Sektion mit Icon + Label-Header.
 * - Pro Einheit ein `<fieldset>` mit `<legend>` `Einheit X` — Checkbox-Liste
 *   der Items des jeweiligen Profils. Native `<input type="checkbox">` mit
 *   `<label htmlFor>` für volle A11y kostenfrei.
 * - Pro Einheit unterhalb der Fieldsets: Status-Pill + „Lücke melden"-Button.
 *
 * **Status:** `pristine` / `in-progress` / `complete` aggregiert über alle
 * Items aller aktiven Profile. `gap-reported` wenn `einheit.luecke` gesetzt
 * ist (Story 3.6).
 *
 * **Multi-Einheit:** skaliert auf N Einheiten (Snapshot-Tests prüfen 1, 2, 5).
 */
export function EquipmentChecklist({ aktiveProfile, einheiten, checked, onToggle, onMeldeLuecke, 'data-testid': dataTestId = 'equipment-checklist' }: EquipmentChecklistProps) {
  const allItems = aggregateItems(aktiveProfile);

  return (
    <div className="space-y-4" data-testid={dataTestId}>
      {aktiveProfile.map((profil) => {
        const meta = PSA_PROFIL_META[profil];
        const Icon = meta.icon;
        const items = getAusruestungsCheckliste(profil).items;
        return (
          <section key={profil} className="space-y-2" data-testid={`${dataTestId}-section-${profil}`}>
            <header className="flex items-center gap-2">
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-text-muted" />
              <h4 className="text-sm font-semibold text-text-primary">{meta.label}</h4>
            </header>
            <div className="space-y-2">
              {einheiten.map((einheit) => (
                <fieldset
                  key={`${profil}-${einheit.einheitId}`}
                  className="rounded-control border border-border-subtle bg-surface-panel p-3"
                  data-testid={`${dataTestId}-fieldset-${einheit.einheitId}-${profil}`}
                >
                  <legend className="px-1 text-xs font-medium text-text-muted">Einheit {einheit.einheitName}</legend>
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const inputId = `${dataTestId}-${einheit.einheitId}-${item.id}`;
                      const isChecked = checked.get(compositeKey(einheit.einheitId, item.id)) === true;
                      return (
                        <li key={item.id} className="flex items-start gap-2">
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={isChecked}
                            onChange={(event) => onToggle(einheit.einheitId, item.id, event.target.checked)}
                            // Touch-Target ≥ 44 × 44 px erbt der `<label>`; das
                            // Input selbst ist visuell kleiner, der gesamte
                            // Label-Block ist klickbar.
                            className="mt-1 h-5 w-5 shrink-0 rounded-sm border-border-subtle text-status-info focus:ring-2 focus:ring-status-info"
                            data-testid={`${dataTestId}-checkbox-${einheit.einheitId}-${item.id}`}
                          />
                          <label htmlFor={inputId} className="flex min-h-11 flex-1 cursor-pointer flex-col py-1 text-sm text-text-primary">
                            <span>{item.label}</span>
                            {item.hinweis !== undefined ? <small className="text-xs text-text-muted">{item.hinweis}</small> : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              ))}
            </div>
          </section>
        );
      })}

      {/* Pro-Einheit Status + Lücke-melden-Button: aggregiert über alle Profile. */}
      <ul className="space-y-2" data-testid={`${dataTestId}-status-list`}>
        {einheiten.map((einheit) => {
          const status = computeStatus(einheit, allItems, checked);
          const statusMeta = STATUS_META[status];
          const missingLabels = allItems.filter((item) => checked.get(compositeKey(einheit.einheitId, item.id)) !== true).map((item) => item.label);
          const vorbereiteteNotiz = missingLabels.join(', ');
          const luecheButtonDisabled = onMeldeLuecke === undefined;
          return (
            <li
              key={einheit.einheitId}
              className="bg-surface-panel-elevated flex flex-wrap items-center justify-between gap-2 rounded-control border border-border-subtle px-3 py-2"
              data-testid={`${dataTestId}-status-row-${einheit.einheitId}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-text-primary">Einheit {einheit.einheitName}</span>
                <span
                  className={cn('inline-flex items-center rounded-control border px-2 py-0.5 text-xs font-semibold', statusMeta.className)}
                  data-testid={`${dataTestId}-status-${einheit.einheitId}`}
                  data-status={status}
                >
                  {statusMeta.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onMeldeLuecke?.({ einheitId: einheit.einheitId, vorbereiteteNotiz })}
                disabled={luecheButtonDisabled}
                aria-label={`Lücke für Einheit ${einheit.einheitName} melden`}
                title={luecheButtonDisabled ? 'Verfügbar ab Story 3.6 (Rückmeldung an Sicherheitsbeauftragten)' : undefined}
                className={cn(
                  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium',
                  'border-status-danger-border text-status-danger-text hover:bg-status-danger-surface/40',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-danger-border',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
                data-testid={`${dataTestId}-luecke-${einheit.einheitId}`}
              >
                Ausrüstungs-Lücke melden
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
