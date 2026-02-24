import { SetMetadata } from '@nestjs/common';

/**
 * Informationen zur Deprecation eines Endpoints.
 *
 * @property sunsetDate - Datum, ab dem der Endpoint nicht mehr verfuegbar ist (ISO 8601)
 * @property successorVersion - Version des Nachfolger-Endpoints (z.B. '1')
 */
export interface DeprecationInfo {
  sunsetDate: string;
  successorVersion: string;
}

/**
 * Metadata-Key fuer den DeprecationInterceptor.
 */
export const DEPRECATION_KEY = 'deprecated';

/**
 * Markiert einen Controller oder Endpoint als deprecated.
 *
 * Setzt RFC 8594 konforme HTTP-Headers:
 * - `Deprecation: true`
 * - `Sunset: <sunsetDate>`
 * - `Link: <successor-url>; rel="successor-version"`
 *
 * Story 5.7 AC2: Deprecation Infrastructure.
 *
 * @param sunsetDate - Datum, ab dem der Endpoint nicht mehr verfuegbar ist (ISO 8601)
 * @param successorVersion - Version des Nachfolger-Endpoints (z.B. '1')
 *
 * @example
 * ```typescript
 * @Deprecated('2026-06-01', '1')
 * @Get()
 * async findAll() { ... }
 * ```
 */
export const Deprecated = (sunsetDate: string, successorVersion: string) => {
  if (!sunsetDate || Number.isNaN(new Date(sunsetDate).getTime())) {
    throw new Error(`@Deprecated: Ungueltiges sunsetDate '${sunsetDate}'. ISO 8601 Format erwartet (z.B. '2026-06-01').`);
  }
  if (!successorVersion || !/^\d+$/.test(successorVersion)) {
    throw new Error(`@Deprecated: Ungueltige successorVersion '${successorVersion}'. Numerischer String erwartet (z.B. '1', '2').`);
  }
  return SetMetadata(DEPRECATION_KEY, { sunsetDate, successorVersion } as DeprecationInfo);
};
