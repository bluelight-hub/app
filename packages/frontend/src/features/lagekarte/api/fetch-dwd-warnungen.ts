/**
 * TanStack Query Hook für DWD-Wetterwarnungen
 *
 * Fragt DWD-Warnungen an einer Koordinate über das Backend-Proxy ab.
 */

import { getApi } from '@/shared/api/api';
import type { DwdWarnungDto } from '@bluelight-hub/shared/client';

/**
 * Fragt DWD-Warnungen an einer Koordinate ab
 *
 * Kein TanStack Query Hook, da die Abfrage nur on-demand beim Klick
 * erfolgt und nicht automatisch refetched werden soll.
 */
export async function fetchDwdWarnungen(lng: number, lat: number, zoom: number): Promise<DwdWarnungDto[]> {
  const response = await getApi().warnungen().warnungenControllerGetDwdWarnungenVAlpha({ lng, lat, zoom });
  return response.data ?? [];
}
