import { EntityId } from '@domain/common/entity-id';

/**
 * Type-Safe EntityId für Fahrzeugtyp Aggregate.
 *
 * Verhindert Primitive Obsession durch typed ID mit compile-time type safety.
 * CUID2 Format für sichere, kollisionsresistente ID-Generierung.
 *
 * **Warum existiert diese Klasse (nicht nur Type Alias)?**
 *
 * Diese Klasse erscheint zunächst leer, bietet aber entscheidende Vorteile gegenüber
 * einem Type Alias (`type FahrzeugtypId = string`) oder Branded Type:
 *
 * 1. **Compile-Time Type Safety:**
 *    - Verhindert versehentliches Vertauschen von IDs unterschiedlicher Aggregates
 *    - TypeScript unterscheidet `FahrzeugtypId` von `EinsatzId`, `QualifikationId`, etc.
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
 *    - "Find Usages" findet alle Stellen die FahrzeugtypId verwenden
 *    - Refactorings sind sicherer (Rename, Extract, etc.)
 *    - Autocomplete unterscheidet zwischen verschiedenen ID-Typen
 *
 * **Alternative (Branded Type):**
 * ```typescript
 * type FahrzeugtypId = string & { __brand: 'FahrzeugtypId' };
 * ```
 * Probleme:
 * - Keine Runtime Validation
 * - Kein Vererbung von EntityId-Logik (equals, toString, create)
 * - Komplexere Syntax für Branding und Casting
 * - Keine automatische ID-Generierung
 *
 * **Fazit:**
 * Die leere Klasse ist ein bewusster Design-Entscheid. Sie delegiert alle Logik an
 * die Base Class `EntityId<'Fahrzeugtyp'>` und bietet dafür Type Safety, Runtime
 * Validation und Konsistenz mit dem Rest der Domain Layer.
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const id = FahrzeugtypId.create();
 * if (id.isSuccess) {
 *   console.log(id.value.toString()); // "clw3h8x9y..."
 * }
 *
 * // Mit existierendem CUID
 * const id2 = FahrzeugtypId.create('clw3h8x9y0000qwertyuiopas');
 *
 * // Type-Safety (Compile-Time)
 * function processFahrzeugtyp(id: FahrzeugtypId) { ... }
 * const qualifikationId = QualifikationId.create().value;
 * processFahrzeugtyp(qualifikationId); // ❌ Compile Error: QualifikationId ≠ FahrzeugtypId
 *
 * // String wäre NICHT type-safe
 * function processFahrzeugtypUnsafe(id: string) { ... }
 * processFahrzeugtypUnsafe(qualifikationId.value); // ✅ Kompiliert (GEFAHR!)
 * processFahrzeugtypUnsafe("invalid-id"); // ✅ Kompiliert (GEFAHR!)
 * ```
 */
export class FahrzeugtypId extends EntityId<'Fahrzeugtyp'> {}
