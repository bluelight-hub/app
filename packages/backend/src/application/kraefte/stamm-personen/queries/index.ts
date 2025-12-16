/**
 * Barrel export für StammPerson Query Handlers und Mapper.
 *
 * **Pattern:**
 * - Query Handlers: Lesen von StammPerson-Daten
 * - Query Mapper: Mapping von Aggregates zu DTOs
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Queries
 */

export { StammPersonQueryMapper } from './stamm-person-query.mapper';
export type { QualifikationData } from './stamm-person-query.mapper';

// Query Handlers
export { GetAllStammPersonenQuery } from './get-all-stamm-personen/get-all-stamm-personen.query';
export { GetAllStammPersonenHandler } from './get-all-stamm-personen/get-all-stamm-personen.handler';
export { GetStammPersonByIdQuery } from './get-stamm-person-by-id/get-stamm-person-by-id.query';
export { GetStammPersonByIdHandler } from './get-stamm-person-by-id/get-stamm-person-by-id.handler';
