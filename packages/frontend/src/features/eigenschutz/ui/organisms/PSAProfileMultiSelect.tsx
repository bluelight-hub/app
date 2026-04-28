import { PSA_PROFIL_META, PSA_PROFIL_REIHENFOLGE } from '../../constants/psa-profil.constants';
import { PSAProfileChip } from '../molecules/PSAProfileChip';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';

/**
 * Multi-Select-Chip-Gruppe der 5 PSA-Profile (Story 3.1 + Story 3.2 Bulk).
 *
 * **Single-Modus** (`aktiveProfileProEinheit` weggelassen): `currentActive`-
 * Set ist der Server-State, `pendingMap` der lokale Diff zur Anzeige.
 *
 * **Bulk-Modus** (`aktiveProfileProEinheit` gesetzt): pro Profil wird ein
 * konsolidierter Status berechnet — `all-active` / `none-active` / `mixed`
 * (manche Einheiten haben das Profil aktiv, andere nicht). Im `mixed`-Fall
 * rendert der Chip `aria-checked="mixed"` mit Badge „auf N von M aktiv".
 * Toggle-Klick im Bulk-Modus wirkt als Set-Operation:
 * - `all-active` → setze auf alle Einheiten DEAKTIVIEREN
 * - `none-active` oder `mixed` → setze auf alle Einheiten AKTIVIEREN
 *
 * Die `pendingMap` repräsentiert im Bulk-Modus die **gewollte Ziel-
 * Aktivität** (true=aktivieren, false=deaktivieren). Ist sie für ein
 * Profil gesetzt, überschreibt sie den konsolidierten Status visuell.
 */
export interface PSAProfileMultiSelectProps {
  readonly currentActive: ReadonlySet<PsaProfilValue>;
  readonly pendingMap: ReadonlyMap<PsaProfilValue, boolean>;
  readonly onToggle: (profil: PsaProfilValue) => void;
  readonly disabled?: boolean;
  /**
   * Bulk-Modus: pro Einheit-ID die Liste der aktiv eingeschalteten Profile.
   * Wenn weggelassen, läuft das Component im Single-Modus (Story 3.1).
   */
  readonly aktiveProfileProEinheit?: ReadonlyMap<string, ReadonlyArray<PsaProfilValue>>;
}

interface ConsolidatedStatus {
  state: 'all-active' | 'none-active' | 'mixed';
  activeCount: number;
  totalCount: number;
}

function computeConsolidatedStatus(profil: PsaProfilValue, aktiveProfile: ReadonlyMap<string, ReadonlyArray<PsaProfilValue>>): ConsolidatedStatus {
  let activeCount = 0;
  let totalCount = 0;
  for (const profile of aktiveProfile.values()) {
    totalCount++;
    if (profile.includes(profil)) activeCount++;
  }
  if (activeCount === 0) return { state: 'none-active', activeCount, totalCount };
  if (activeCount === totalCount) return { state: 'all-active', activeCount, totalCount };
  return { state: 'mixed', activeCount, totalCount };
}

export function PSAProfileMultiSelect({ currentActive, pendingMap, onToggle, disabled = false, aktiveProfileProEinheit }: PSAProfileMultiSelectProps) {
  const isBulk = aktiveProfileProEinheit !== undefined;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-text-secondary">PSA-Profile</legend>
      <div className="flex flex-wrap gap-2">
        {PSA_PROFIL_REIHENFOLGE.map((profil) => {
          if (!isBulk) {
            const isActive = currentActive.has(profil);
            const pending = pendingMap.has(profil);
            const optimistic = pendingMap.get(profil) ?? isActive;
            return <PSAProfileChip key={profil} profil={profil} active={isActive} optimisticActive={optimistic} pendingChange={pending} onToggle={() => onToggle(profil)} disabled={disabled} />;
          }
          // Bulk-Modus: konsolidierter Status pro Profil über alle Einheiten.
          const status = computeConsolidatedStatus(profil, aktiveProfileProEinheit);
          const pendingTarget = pendingMap.get(profil);
          const hasPending = pendingMap.has(profil);
          const optimisticActive = pendingTarget !== undefined ? pendingTarget : status.state === 'all-active';
          const showMixed = !hasPending && status.state === 'mixed';
          return (
            <PSAProfileChip
              key={profil}
              profil={profil}
              active={status.state === 'all-active'}
              optimisticActive={optimisticActive}
              pendingChange={hasPending}
              mixed={showMixed}
              mixedBadge={showMixed ? `auf ${status.activeCount} von ${status.totalCount} aktiv` : undefined}
              onToggle={() => onToggle(profil)}
              disabled={disabled}
            />
          );
        })}
      </div>
      <p className="text-xs text-text-muted">{pendingMap.size === 0 ? 'Keine Änderung' : `${pendingMap.size} ${pendingMap.size === 1 ? 'Änderung vorgemerkt' : 'Änderungen vorgemerkt'}`}</p>
      <ul className="sr-only">
        {/* Screenreader-Differenzierung — nicht im visuellen Layout sichtbar. */}
        {[...pendingMap.entries()].map(([profil, willBeActive]) => (
          <li key={profil}>{`${PSA_PROFIL_META[profil].label} wird ${willBeActive ? 'aktiviert' : 'deaktiviert'}`}</li>
        ))}
      </ul>
    </fieldset>
  );
}
