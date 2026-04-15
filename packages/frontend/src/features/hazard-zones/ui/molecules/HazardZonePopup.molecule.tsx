import type { HazardZoneDto } from '@bluelight-hub/shared/client';
import { useGefahrenmatrix } from '@/features/gefahrenmatrix/api/queries';
import { GEFAHRENTYP_LABELS, SCHUTZOBJEKT_LABELS, type GefahrentypValue, type SchutzobjektValue, type WarnstufeValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import { WarnstufeBadge } from '@/features/gefahrenmatrix/ui/atoms/WarnstufeBadge';

export interface HazardZonePopupProps {
  zone: HazardZoneDto;
  onClose?: () => void;
}

/**
 * Popup-Inhalt einer Gefahrenzone (Issue #627, AC4).
 *
 * Zeigt:
 * - Label + Beschreibung der Zone
 * - Gefahrentyp (aus Gefahrenmatrix)
 * - Alle Bewertungen für diesen Gefahrentyp mit Warnstufe pro Schutzobjekt
 * - Höchste aggregierte Warnstufe (Farbcodierung der Zone)
 *
 * Die Matrix-Daten werden über {@link useGefahrenmatrix} geladen — TanStack
 * Query dedupliziert automatisch mit dem Matrix-Grid.
 */
export function HazardZonePopup({ zone, onClose }: HazardZonePopupProps) {
  const { data: matrix, isLoading } = useGefahrenmatrix(zone.einsatzId);

  const bewertungenForTyp = (matrix?.bewertungen ?? []).filter((b) => b.gefahrentyp === zone.gefahrentyp);
  const gefahrentypLabel = GEFAHRENTYP_LABELS[zone.gefahrentyp as GefahrentypValue] ?? zone.gefahrentyp;

  return (
    <div className="max-w-[360px] min-w-[260px] space-y-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs tracking-wide text-text-muted uppercase">Gefahrenzone</span>
          <span className="font-semibold">{zone.label ?? gefahrentypLabel}</span>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Schließen">
            ×
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Gefahrentyp:</span>
        <span className="font-medium">{gefahrentypLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Höchste Warnstufe:</span>
        <WarnstufeBadge warnstufe={zone.maxWarnstufe as WarnstufeValue} />
      </div>

      {zone.beschreibung ? <p className="text-xs text-text-secondary">{zone.beschreibung}</p> : null}

      <div className="border-t border-border-subtle pt-2">
        <p className="text-xs font-semibold text-text-muted">Bewertungen aus der Gefahrenmatrix</p>
        {isLoading ? (
          <p className="text-xs text-text-muted">Lade Matrix…</p>
        ) : bewertungenForTyp.length === 0 ? (
          <p className="text-xs text-text-muted">Keine Bewertung erfasst.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {bewertungenForTyp.map((bewertung) => (
              <li key={bewertung.id} className="flex items-center justify-between gap-2">
                <span className="text-xs">{SCHUTZOBJEKT_LABELS[bewertung.schutzobjekt as SchutzobjektValue] ?? bewertung.schutzobjekt}</span>
                <WarnstufeBadge warnstufe={bewertung.warnstufe as WarnstufeValue} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
