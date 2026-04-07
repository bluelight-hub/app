/**
 * API-Funktion für NINA-Warnungs-Details
 *
 * Fragt Detail-Informationen zu einer einzelnen NINA-Warnung ab.
 */

import { getApi } from '@/shared/api/api';

/**
 * Fragt Detail-Informationen zu einer einzelnen NINA-Warnung ab
 */
export async function fetchNinaWarnungDetail(warnungId: string) {
  const response = await getApi().warnungen().warnungenControllerGetNinaWarnungDetailVAlpha({ warnungId });
  return response.data;
}
