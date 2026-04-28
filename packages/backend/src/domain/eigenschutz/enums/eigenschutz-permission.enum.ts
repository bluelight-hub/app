/**
 * String-Literal-Union der Eigenschutz-Permissions (MVP-Inventar aus
 * Architecture §B10 Z. 699–706, FR44–FR47).
 *
 * **Match-Semantik:** Exakter String-Match gegen `User.permissions` (JSON-Array,
 * via `EinsatzScopeGuard` in `request.einsatzContext.einsatzPermissions` geparsed).
 * Kein Wildcard-Matching — `eigenschutz:*` matcht nichts (AC3).
 *
 * @see ALL_EIGENSCHUTZ_PERMISSIONS für Laufzeit-Iteration
 */
export type EigenschutzPermission =
  | 'eigenschutz:gefaehrdungsbeurteilung:read'
  | 'eigenschutz:gefaehrdungsbeurteilung:write'
  | 'eigenschutz:psa:read'
  | 'eigenschutz:psa:write'
  | 'eigenschutz:psa:acknowledge'
  | 'eigenschutz:sicherheitsregel:read'
  | 'eigenschutz:sicherheitsregel:write'
  | 'eigenschutz:sicherheitsregel:acknowledge'
  | 'eigenschutz:sicherungsposten:read'
  | 'eigenschutz:sicherungsposten:write'
  | 'eigenschutz:vorfall:read'
  | 'eigenschutz:vorfall:report'
  | 'eigenschutz:vorfall:export'
  | 'eigenschutz:telemetry:write';

/**
 * Laufzeit-iterierbare Liste aller Eigenschutz-Permissions.
 * 14 Einträge aus Architecture §B10 Z. 699–706 + Story 3.4 (psa:acknowledge).
 */
export const ALL_EIGENSCHUTZ_PERMISSIONS: readonly EigenschutzPermission[] = [
  'eigenschutz:gefaehrdungsbeurteilung:read',
  'eigenschutz:gefaehrdungsbeurteilung:write',
  'eigenschutz:psa:read',
  'eigenschutz:psa:write',
  'eigenschutz:psa:acknowledge',
  'eigenschutz:sicherheitsregel:read',
  'eigenschutz:sicherheitsregel:write',
  'eigenschutz:sicherheitsregel:acknowledge',
  'eigenschutz:sicherungsposten:read',
  'eigenschutz:sicherungsposten:write',
  'eigenschutz:vorfall:read',
  'eigenschutz:vorfall:report',
  'eigenschutz:vorfall:export',
  'eigenschutz:telemetry:write',
] as const;
