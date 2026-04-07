/**
 * API-Funktion für NINA-Warnungen
 *
 * Fragt NINA-Warnungen an einer Koordinate über das Backend-Proxy ab.
 * Das Backend löst den AGS automatisch per Nominatim Reverse-Geocoding auf.
 */

import { getApi } from '@/shared/api/api';
import type { NinaWarnungDto } from '@bluelight-hub/shared/client';

/**
 * Fragt NINA-Warnungen an einer Koordinate ab
 */
export async function fetchNinaWarnungen(lng: number, lat: number): Promise<NinaWarnungDto[]> {
  const response = await getApi().warnungen().warnungenControllerGetNinaWarnungenVAlpha({ lng, lat });
  return response.data ?? [];
}
