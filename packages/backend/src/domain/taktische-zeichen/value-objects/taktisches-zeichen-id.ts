import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe EntityId für TaktischesZeichen Aggregate.
 *
 * Verhindert Primitive Obsession durch typed ID mit compile-time Type Safety.
 * CUID2 Format für sichere, kollisionsresistente ID-Generierung.
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const idResult = TaktischesZeichenId.create();
 * if (idResult.isSuccess) {
 *   console.log(idResult.value.toString()); // "clw3h8x9y..."
 * }
 *
 * // Mit vorhandenem CUID
 * const id2 = TaktischesZeichenId.create('clw3h8x9y0000qwertyuiopas');
 * ```
 */
export class TaktischesZeichenId extends EntityId<'TaktischesZeichen'> {}
