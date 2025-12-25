import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe EntityId für RollenBesetzung Aggregate.
 *
 * Verhindert Primitive Obsession durch typed ID mit compile-time type safety.
 * CUID2 Format für sichere, kollisionsresistente ID-Generierung.
 *
 * **Warum existiert diese Klasse (nicht nur Type Alias)?**
 *
 * Diese Klasse erscheint zunächst leer, bietet aber entscheidende Vorteile gegenüber
 * einem Type Alias (`type RollenBesetzungId = string`) oder Branded Type:
 *
 * 1. **Compile-Time Type Safety:**
 *    - Verhindert versehentliches Vertauschen von IDs unterschiedlicher Aggregates
 *    - TypeScript unterscheidet `RollenBesetzungId` von `EinsatzPersonId`, `RolleId`, etc.
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
 * 4. **Konsistenz mit DDD Patterns:**
 *    - Verhindert Primitive Obsession Anti-Pattern
 *    - IDs sind Domain Konzepte, keine primitiven Strings
 *    - Ermöglicht zukünftige Erweiterungen (z.B. custom Validation, Formatting)
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const id = RollenBesetzungId.create();
 * if (id.isSuccess) {
 *   console.log(id.value.toString()); // "clw3h8x9y..."
 * }
 *
 * // Mit existierendem CUID
 * const id2 = RollenBesetzungId.create('clw3h8x9y0000qwertyuiopas');
 *
 * // Type-Safety (Compile-Time)
 * function processRollenBesetzung(id: RollenBesetzungId) { ... }
 * const personId = EinsatzPersonId.create().value;
 * processRollenBesetzung(personId); // ❌ Compile Error: EinsatzPersonId ≠ RollenBesetzungId
 * ```
 */
export class RollenBesetzungId extends EntityId<'RollenBesetzung'> {}
