/**
 * Sentinel-Codes für `ListVorfaelleQuery` (Story 5.3, AC2).
 *
 * Controller-Mapping:
 * - `ValidationFailed:VorfallListFilter:*` → 400
 * - `InfrastructureError:*` → 500
 * Andere Sentinel-Präfixe werden vom Pass-Through-Helper unverändert
 * weitergereicht (analog `LIST_SYNC_CONFLICTS_ERROR_CODES`).
 */
export const LIST_VORFAELLE_ERROR_CODES = {
  EINSATZ_REQUIRED: 'ValidationFailed:VorfallListFilter:EinsatzRequired',
  EINHEIT_IDS_CAP: 'ValidationFailed:VorfallListFilter:EinheitIdsCap',
  RANGE_INVALID: 'ValidationFailed:VorfallListFilter:RangeInvalid',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:ListEigenschutzVorfaelle',
} as const;

export type ListVorfaelleErrorCode = (typeof LIST_VORFAELLE_ERROR_CODES)[keyof typeof LIST_VORFAELLE_ERROR_CODES];

/**
 * Defense gegen `IN`-Bombs aus dem URL-Param. Frontend cap-t bereits auf 50
 * (siehe `resolveAbschnittToEinheitIds`), Backend hält den gleichen Wert
 * als Server-Side-Defense.
 */
export const VORFALL_FILTER_EINHEIT_IDS_CAP = 50 as const;
