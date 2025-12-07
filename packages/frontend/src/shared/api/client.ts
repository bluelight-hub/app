/**
 * Shared API Client Re-Export
 *
 * Zentraler Re-Export des Backend-API-Clients für die Verwendung in der gesamten Anwendung.
 * Der API-Client wird im ursprünglichen api/ Verzeichnis initialisiert und hier nur re-exportiert.
 *
 * @example
 * ```typescript
 * import { api } from '@/shared/api/client';
 * const einsaetze = await api.einsatz().findAll();
 * ```
 */

export { api, getBaseUrl } from './api';
