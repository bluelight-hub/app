import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe EntityId für FunkStatusConfig Aggregate.
 *
 * Verhindert Primitive Obsession durch typed ID mit compile-time type safety.
 * CUID2 Format für sichere, kollisionsresistente ID-Generierung.
 *
 * **Warum existiert diese Klasse (nicht nur Type Alias)?**
 *
 * Diese Klasse erscheint zunächst leer, bietet aber entscheidende Vorteile gegenüber
 * einem Type Alias (`type FunkStatusConfigId = string`) oder Branded Type:
 *
 * 1. **Compile-Time Type Safety:**
 *    - Verhindert versehentliches Vertauschen von IDs unterschiedlicher Aggregates
 *    - TypeScript unterscheidet `FunkStatusConfigId` von `QualifikationId`, `EinsatzId`, etc.
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
 * 5. **IDE Support und Refactoring:**
 *    - "Find Usages" findet alle Stellen die FunkStatusConfigId verwenden
 *    - Refactorings sind sicherer (Rename, Extract, etc.)
 *    - Autocomplete unterscheidet zwischen verschiedenen ID-Typen
 *
 * **Alternative (Branded Type):**
 * ```typescript
 * type FunkStatusConfigId = string & { __brand: 'FunkStatusConfigId' };
 * ```
 * Probleme:
 * - Keine Runtime Validation
 * - Kein Vererbung von EntityId-Logik (equals, toString, create)
 * - Komplexere Syntax für Branding und Casting
 * - Keine automatische ID-Generierung
 *
 * **Fazit:**
 * Die leere Klasse ist ein bewusster Design-Entscheid. Sie delegiert alle Logik an
 * die Base Class `EntityId<'FunkStatusConfig'>` und bietet dafür Type Safety, Runtime
 * Validation und Konsistenz mit dem Rest der Domain Layer.
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const id = FunkStatusConfigId.create();
 * if (id.isSuccess) {
 *   console.log(id.value.toString()); // "clw3h8x9y..."
 * }
 *
 * // Mit existierendem CUID
 * const id2 = FunkStatusConfigId.create('clw3h8x9y0000qwertyuiopas');
 *
 * // Type-Safety (Compile-Time)
 * function processFunkStatusConfig(id: FunkStatusConfigId) { ... }
 * const qualifikationId = QualifikationId.create().value;
 * processFunkStatusConfig(qualifikationId); // ❌ Compile Error: QualifikationId ≠ FunkStatusConfigId
 *
 * // String wäre NICHT type-safe
 * function processFunkStatusConfigUnsafe(id: string) { ... }
 * processFunkStatusConfigUnsafe(qualifikationId.value); // ✅ Kompiliert (GEFAHR!)
 * processFunkStatusConfigUnsafe("invalid-id"); // ✅ Kompiliert (GEFAHR!)
 * ```
 */
export class FunkStatusConfigId extends EntityId<'FunkStatusConfig'> {}
