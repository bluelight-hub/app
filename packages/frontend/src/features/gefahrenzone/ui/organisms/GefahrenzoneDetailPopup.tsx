import { PiArrowRight } from 'react-icons/pi';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { GEFAHRENTYP_LABELS, WARNSTUFEN, type GefahrentypValue, type WarnstufeValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import { WarnstufeChip } from '@/features/gefahrenmatrix/ui/atoms/WarnstufeChip';

export interface GefahrenzoneDetailPopupProps {
  zone: GefahrenzoneDto;
}

function normalizeWarnstufe(input: unknown): WarnstufeValue {
  if (typeof input === 'string' && WARNSTUFEN.includes(input as WarnstufeValue)) {
    return input as WarnstufeValue;
  }
  return 'KEINE';
}

/**
 * Kompakte Popup-Ansicht für eine Gefahrenzone — wird direkt auf der Karte
 * am Klick-Punkt angezeigt. Primär zum Erkennen; die volle Bearbeitung
 * passiert im Side-Panel.
 */
export function GefahrenzoneDetailPopup({ zone }: GefahrenzoneDetailPopupProps) {
  const warnstufe = normalizeWarnstufe(zone.warnstufe);
  const label = GEFAHRENTYP_LABELS[zone.gefahrentyp as GefahrentypValue] ?? zone.gefahrentyp;

  return (
    <div className="flex max-w-[260px] flex-col gap-2">
      <div className="flex items-center gap-2">
        <WarnstufeChip warnstufe={warnstufe} size="sm" />
        <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
      </div>
      {zone.bezeichnung ? <p className="text-xs text-text-secondary">{String(zone.bezeichnung)}</p> : null}
      <p className="inline-flex items-center gap-1 text-[11px] text-text-muted">
        Details im Panel
        <PiArrowRight className="size-3" aria-hidden />
      </p>
    </div>
  );
}
