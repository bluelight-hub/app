/**
 * Sentinel-Codes für `ResolveKonfliktHandler` (Story 3.10 AC4).
 *
 * Der Controller mappt die Präfixe deterministisch:
 * - `NotFound:*` → 404
 * - `BusinessRule:*` / `ValidationFailed:*` → 422
 * - `ConflictDetected:*` → 409 (sekundäres Race im LOCAL_WINS-Reapply)
 * - `InfrastructureError:*` → 500
 */
export const RESOLVE_KONFLIKT_ERROR_CODES = {
  EINSATZ_REQUIRED: 'BusinessRule:EinsatzIdErforderlich',
  CALLER_REQUIRED: 'BusinessRule:CallerUserIdErforderlich',
  CONFLICT_ID_REQUIRED: 'BusinessRule:SyncConflictIdErforderlich',
  RESOLUTION_INVALID: 'BusinessRule:ResolutionInvalid',
  CONFLICT_NOT_FOUND: 'NotFound:SyncConflict',
  CONFLICT_NOT_IN_EINSATZ: 'BusinessRule:KonfliktNichtImEinsatz',
  ENTITY_TYPE_NOT_SUPPORTED: 'BusinessRule:EntityTypeNotSupportedInStory310',
  NOT_TEILNEHMER: 'BusinessRule:UnzulaessigeEinheitenZuordnung',
  LOCAL_WINS_AGGREGATE_NOT_FOUND: 'BusinessRule:LocalWinsNichtMoeglich:AggregateNichtGefunden',
  LOCAL_WINS_PAYLOAD_INVALID: 'ValidationFailed:LocalWinsPayloadInvalid',
  INFRASTRUCTURE_ERROR: 'InfrastructureError:Eigenschutz',
} as const;

export type ResolveKonfliktErrorCode = (typeof RESOLVE_KONFLIKT_ERROR_CODES)[keyof typeof RESOLVE_KONFLIKT_ERROR_CODES];
