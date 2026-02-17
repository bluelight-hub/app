import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe ID für Befehl Aggregates.
 * Verhindert Primitive Obsession und ermöglicht compile-time type safety.
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const result = BefehlId.create();
 * if (result.isSuccess) {
 *   const id: BefehlId = result.value;
 * }
 *
 * // Type-Safety: BefehlId ≠ EinsatzId
 * function processBefehl(id: BefehlId) { ... }
 * const einsatzId = EinsatzId.create().value;
 * processBefehl(einsatzId); // ❌ Compile Error
 * ```
 */
export class BefehlId extends EntityId<'Befehl'> {}
