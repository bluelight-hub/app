/**
 * Sentinel-Codes für `ListSyncConflictsQuery` (Story 3.10 AC3).
 *
 * Der Controller mappt die Präfixe deterministisch:
 * - `BusinessRule:*` / `ValidationFailed:*` → 422
 * - `InfrastructureError:*` → 500
 *
 * Pattern analog `REPORT_SYNC_CONFLICT_ERROR_CODES` (Story 3.9 AC4).
 */
export const LIST_SYNC_CONFLICTS_ERROR_CODES = {
  EINSATZ_REQUIRED: 'BusinessRule:EinsatzIdErforderlich',
  CALLER_REQUIRED: 'BusinessRule:CallerUserIdErforderlich',
  NOT_TEILNEHMER: 'BusinessRule:UnzulaessigeEinheitenZuordnung',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:Eigenschutz',
} as const;

export type ListSyncConflictsErrorCode = (typeof LIST_SYNC_CONFLICTS_ERROR_CODES)[keyof typeof LIST_SYNC_CONFLICTS_ERROR_CODES];
