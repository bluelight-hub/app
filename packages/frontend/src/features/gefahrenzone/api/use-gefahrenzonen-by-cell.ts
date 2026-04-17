/**
 * useGefahrenzonenByCell (Issue #627, G3)
 *
 * Gruppiert die Zonen eines Einsatzes clientseitig nach Matrix-Zelle
 * `(gefahrentyp, schutzobjekt)`. Liefert Map + Count-Map für Badge/Orphan-
 * Indicator-Rendering in der Gefahrenmatrix sowie Bounding-Box-Berechnungen
 * in Split-View-Szenarien (G4).
 */

import { useMemo } from 'react';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import type { GefahrentypValue, SchutzobjektValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import { useGefahrenzonen } from './queries';

export type GefahrenzonenCellKey = `${GefahrentypValue}:${SchutzobjektValue}`;

export interface GefahrenzonenByCell {
  byCell: Map<GefahrenzonenCellKey, GefahrenzoneDto[]>;
  countByCell: Map<GefahrenzonenCellKey, number>;
}

export function cellKey(gefahrentyp: string, schutzobjekt: string): GefahrenzonenCellKey {
  return `${gefahrentyp}:${schutzobjekt}` as GefahrenzonenCellKey;
}

/**
 * Gruppiert die Zonen aus dem TanStack-Query-Cache; leere Eingabe → leere Maps.
 * Rückgabe-Map-Instanzen sind stabil, solange `zonen` sich nicht ändert
 * (via `useMemo`).
 */
export function useGefahrenzonenByCell(einsatzId: string): {
  data: GefahrenzonenByCell;
  isLoading: boolean;
} {
  const { data: zonen = [], isLoading } = useGefahrenzonen(einsatzId);

  const data = useMemo<GefahrenzonenByCell>(() => {
    const byCell = new Map<GefahrenzonenCellKey, GefahrenzoneDto[]>();
    for (const zone of zonen) {
      const key = cellKey(zone.gefahrentyp, zone.schutzobjekt);
      const bucket = byCell.get(key);
      if (bucket) {
        bucket.push(zone);
      } else {
        byCell.set(key, [zone]);
      }
    }
    const countByCell = new Map<GefahrenzonenCellKey, number>();
    for (const [key, value] of byCell) {
      countByCell.set(key, value.length);
    }
    return { byCell, countByCell };
  }, [zonen]);

  return { data, isLoading };
}
