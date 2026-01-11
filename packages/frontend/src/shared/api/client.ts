/**
 * Shared API Client Re-Export
 *
 * Zentraler Re-Export des Backend-API-Clients und Types für die Verwendung in der gesamten Anwendung.
 * Der API-Client wird im ursprünglichen api/ Verzeichnis initialisiert und hier nur re-exportiert.
 *
 * @example
 * ```typescript
 * import { api } from '@/shared';
 * import type { EinsatzDto, ResponseError } from '@/shared';
 * const einsaetze = await api.einsatz().findAll();
 * ```
 */

export { api, clearApiCache, getApi, getBaseUrl } from './api';
export * from './types';
