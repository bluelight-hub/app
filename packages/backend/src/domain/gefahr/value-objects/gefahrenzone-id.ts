import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe ID für Gefahrenzonen.
 *
 * Abgegrenzt von GefahrId (Matrix-Bewertung), damit Zone-IDs nicht versehentlich
 * für Matrix-Operationen verwendet werden können.
 */
export class GefahrenzoneId extends EntityId<'Gefahrenzone'> {}
