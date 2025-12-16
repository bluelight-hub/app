/**
 * Rate Limiting Konstanten für HTTP Endpoints.
 *
 * Definiert standardisierte Rate-Limit-Konfigurationen für verschiedene Endpoint-Kategorien.
 * Single Source of Truth für alle @Throttle() Decorator Konfigurationen.
 *
 * Rationale:
 * - Admin-Endpoints: Moderat limitiert (20/min) - Balance zwischen Usability und Security
 * - Auth-Endpoints: Strikt (5/min Login, 10/min Refresh) - Brute-Force-Schutz
 * - Geocoding: Extrem strikt (1/sec Service) - Externe API-Limitierungen respektieren
 */

/**
 * Rate Limit für Admin-Endpoints (Stammdaten-Verwaltung wie Qualifikationen, Fahrzeugtypen, Rollen).
 *
 * 20 Requests pro Minute erlaubt normale Admin-Arbeit (Tabelle scrollen, CRUD-Operationen)
 * während DoS-Versuche durch automatisierte Skripte verhindert werden.
 */
export const ADMIN_RATE_LIMIT = {
  limit: 20,
  ttl: 60000, // 60 Sekunden
} as const;

/**
 * Rate Limit für Auth-Login-Endpoints.
 *
 * Strikt limitiert (5/min) um Brute-Force-Attacken auf Passwörter zu verhindern.
 * Bei überschreitung erhält Client 429 Too Many Requests.
 */
export const AUTH_LOGIN_RATE_LIMIT = {
  limit: 5,
  ttl: 60000,
} as const;

/**
 * Rate Limit für Auth-Token-Refresh-Endpoints.
 *
 * Moderater als Login (10/min), da legitime Clients öfter refreshen können.
 */
export const AUTH_REFRESH_RATE_LIMIT = {
  limit: 10,
  ttl: 60000,
} as const;

/**
 * Rate Limit für Geocoding-Controller-Endpoints.
 *
 * Begrenzt externe API-Calls zu Nominatim/OSM.
 */
export const GEOCODING_RATE_LIMIT = {
  limit: 10,
  ttl: 60000,
} as const;

/**
 * Rate Limit für Geocoding-Service (interne Nominatim-API-Aufrufe).
 *
 * 1 Request pro Sekunde - respektiert Nominatim Usage Policy.
 */
export const GEOCODING_SERVICE_RATE_LIMIT = {
  limit: 1,
  ttl: 1000, // 1 Sekunde
} as const;

/**
 * Rate Limit für Admin Mutation-Endpoints (POST, PATCH, DELETE).
 *
 * Strikteres Limit um Spam/Missbrauch zu verhindern.
 * 10 Requests pro Minute erlaubt normale Admin-Mutation-Operationen
 * (Create/Update/Deactivate von Stammdaten) während Spam-Versuche blockiert werden.
 *
 * WARUM strikteres Limit als Read-Endpoints:
 * - Mutation-Endpoints sind teurer (DB-Writes, Validierung, Audit-Trail)
 * - Höheres Missbrauchs-Risiko (Spam-Erstellung von Ressourcen)
 * - Normale Admin-Arbeit benötigt weniger Mutations-Requests als Read-Requests
 */
export const ADMIN_MUTATION_RATE_LIMIT = {
  limit: 10,
  ttl: 60000, // 60 Sekunden
} as const;
