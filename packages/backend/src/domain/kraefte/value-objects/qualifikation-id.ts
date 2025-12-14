import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe EntityId für Qualifikation Aggregate.
 *
 * Verhindert Primitive Obsession durch typed ID mit compile-time type safety.
 * CUID2 Format für sichere, kollisionsresistente ID-Generierung.
 *
 * **Warum existiert diese Klasse (nicht nur Type Alias)?**
 *
 * Diese Klasse erscheint zunächst leer, bietet aber entscheidende Vorteile gegenüber
 * einem Type Alias (`type QualifikationId = string`) oder Branded Type:
 *
 * 1. **Compile-Time Type Safety:**
 *    - Verhindert versehentliches Vertauschen von IDs unterschiedlicher Aggregates
 *    - TypeScript unterscheidet `QualifikationId` von `EinsatzId`, `RolleId`, etc.
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
 *    - "Find Usages" findet alle Stellen die QualifikationId verwenden
 *    - Refactorings sind sicherer (Rename, Extract, etc.)
 *    - Autocomplete unterscheidet zwischen verschiedenen ID-Typen
 *
 * **Alternative (Branded Type):**
 * ```typescript
 * type QualifikationId = string & { __brand: 'QualifikationId' };
 * ```
 * Probleme:
 * - Keine Runtime Validation
 * - Kein Vererbung von EntityId-Logik (equals, toString, create)
 * - Komplexere Syntax für Branding und Casting
 * - Keine automatische ID-Generierung
 *
 * **Fazit:**
 * Die leere Klasse ist ein bewusster Design-Entscheid. Sie delegiert alle Logik an
 * die Base Class `EntityId<'Qualifikation'>` und bietet dafür Type Safety, Runtime
 * Validation und Konsistenz mit dem Rest der Domain Layer.
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const id = QualifikationId.create();
 * if (id.isSuccess) {
 *   console.log(id.value.toString()); // "clw3h8x9y..."
 * }
 *
 * // Mit existierendem CUID
 * const id2 = QualifikationId.create('clw3h8x9y0000qwertyuiopas');
 *
 * // Type-Safety (Compile-Time)
 * function processQualifikation(id: QualifikationId) { ... }
 * const einsatzId = EinsatzId.create().value;
 * processQualifikation(einsatzId); // ❌ Compile Error: EinsatzId ≠ QualifikationId
 *
 * // String wäre NICHT type-safe
 * function processQualifikationUnsafe(id: string) { ... }
 * processQualifikationUnsafe(einsatzId.value); // ✅ Kompiliert (GEFAHR!)
 * processQualifikationUnsafe("invalid-id"); // ✅ Kompiliert (GEFAHR!)
 * ```
 */
export class QualifikationId extends EntityId<'Qualifikation'> {}
