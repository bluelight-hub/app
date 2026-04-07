/**
 * DWD Warnungen API
 *
 * Proxy-Abfrage über das Backend.
 * Re-exportiert den generierten Typ für interne Verwendung.
 */

import { fetchDwdWarnungen } from '../../api/fetch-dwd-warnungen';

export type { DwdWarnungDto as DwdWarnung } from '@bluelight-hub/shared/client';

/**
 * Fragt DWD-Warnungen an einer bestimmten Koordinate über das Backend ab
 */
export async function queryDwdWarnungen(lng: number, lat: number, zoom: number) {
  return fetchDwdWarnungen(lng, lat, zoom);
}
