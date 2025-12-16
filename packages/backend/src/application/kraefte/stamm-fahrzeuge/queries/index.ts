/**
 * Barrel export für StammFahrzeug Query Handlers und Mapper.
 *
 * **Pattern:**
 * - Query Handlers: Lesen von StammFahrzeug-Daten
 * - Query Mapper: Mapping von Aggregates zu DTOs
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer Queries
 */

export { StammFahrzeugQueryMapper } from './stamm-fahrzeug-query.mapper';

// Query Handlers
export { GetAllStammFahrzeugeQuery } from './get-all-stamm-fahrzeuge/get-all-stamm-fahrzeuge.query';
export { GetAllStammFahrzeugeHandler } from './get-all-stamm-fahrzeuge/get-all-stamm-fahrzeuge.handler';
export { GetStammFahrzeugByIdQuery } from './get-stamm-fahrzeug-by-id/get-stamm-fahrzeug-by-id.query';
export { GetStammFahrzeugByIdHandler } from './get-stamm-fahrzeug-by-id/get-stamm-fahrzeug-by-id.handler';
