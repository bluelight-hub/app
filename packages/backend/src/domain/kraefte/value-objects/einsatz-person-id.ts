import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe EntityId für EinsatzPerson Aggregate.
 *
 * Verhindert Primitive Obsession durch typed ID mit compile-time type safety.
 * CUID2 Format für sichere, kollisionsresistente ID-Generierung.
 *
 * **Warum existiert diese Klasse (nicht nur Type Alias)?**
 *
 * Diese Klasse erscheint zunächst leer, bietet aber entscheidende Vorteile gegenüber
 * einem Type Alias (`type EinsatzPersonId = string`) oder Branded Type:
 *
 * 1. **Compile-Time Type Safety:**
 *    - Verhindert versehentliches Vertauschen von IDs unterschiedlicher Aggregates
 *    - TypeScript unterscheidet `EinsatzPersonId` von `StammPersonId`, `EinsatzId`, etc.
 *    - String Type Aliases bieten KEINE Type Safety (alle sind `string`)
 *
 * 2. **Runtime Validation:**
 *    - Factory Method `create()` validiert CUID2-Format zur Laufzeit
 *    - Garantiert dass nur valide IDs instanziiert werden können
 *    - Type Aliases haben KEINE Runtime Validation
 *
 * 3. **Vererbt Entity-ID Logik:**
 *    - Automatische ID-Generierung via `createId()` (CUID2)
 *    - `equals()` Methode für strukturelle Gleichheit
 *    - `toString()` für Logging und Debugging
 *    - ValueObject Semantik (Immutability, Equality by Value)
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const id = EinsatzPersonId.create();
 * if (id.isSuccess) {
 *   console.log(id.value.toString()); // "clw3h8x9y..."
 * }
 *
 * // Mit existierendem CUID
 * const id2 = EinsatzPersonId.create('clw3h8x9y0000qwertyuiopas');
 *
 * // Type-Safety (Compile-Time)
 * function processEinsatzPerson(id: EinsatzPersonId) { ... }
 * const stammId = StammPersonId.create().value;
 * processEinsatzPerson(stammId); // ❌ Compile Error: StammPersonId ≠ EinsatzPersonId
 * ```
 */
export class EinsatzPersonId extends EntityId<'EinsatzPerson'> {}
