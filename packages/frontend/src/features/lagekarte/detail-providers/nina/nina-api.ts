/**
 * NINA Warnungen API
 *
 * Proxy-Abfrage über das Backend.
 */

import { fetchNinaWarnungen } from '../../api/fetch-nina-warnungen';

export type { NinaWarnungDto as NinaWarnung } from '@bluelight-hub/shared/client';

/**
 * Fragt NINA-Warnungen an einer Koordinate über das Backend ab
 */
export async function queryNinaWarnungen(lng: number, lat: number) {
  return fetchNinaWarnungen(lng, lat);
}
