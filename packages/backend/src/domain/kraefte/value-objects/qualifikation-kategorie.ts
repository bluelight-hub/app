import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

/**
 * Prisma ENUM Typ für Qualifikation-Kategorien.
 * Muss konsistent mit schema.prisma bleiben.
 */
export type QualifikationKategorieType = 'FUEHRUNG' | 'SANITAET' | 'BETREUUNG' | 'TECHNIK' | 'SONSTIGES';

/**
 * Runtime constant array für Validation, OpenAPI Documentation und UI-Dropdown-Listen.
 *
 * **WARUM exportiert als const array?**
 * - TypeScript type aliases existieren nur zur Compile-Zeit
 * - class-validator's @IsEnum() benötigt Runtime-Objekt
 * - @ApiProperty({ enum: ... }) benötigt Runtime-Array für Swagger UI
 * - Frontend-Dropdowns benötigen die Liste zur Laufzeit
 * - Single Source of Truth für erlaubte Kategorie-Werte
 */
export const QUALIFIKATION_KATEGORIEN: readonly QualifikationKategorieType[] = ['FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES'] as const;

/**
 * Props Interface für QualifikationKategorie Value Object.
 */
interface QualifikationKategorieProps extends Record<string, unknown> {
  value: QualifikationKategorieType;
}

/**
 * QualifikationKategorie Value Object mit zentralisierter Domain-Validierung.
 *
 * Kapselt die Business Rules für Qualifikation-Kategorien:
 * - Validierung gegen erlaubte ENUM-Werte
 * - Zentrale Fehlerbehandlung mit Result Pattern
 * - Immutabilität durch ValueObject Base Class
 *
 * **WARUM ein Value Object statt Type Alias?**
 *
 * 1. **Single Source of Truth für Validation:**
 *    - Kategorie-Validierung ist nur EINMAL im Value Object definiert
 *    - OHNE Value Object: Duplizierte Validierung in Aggregate, Commands, DTOs, Services
 *    - Verhindert Inkonsistenzen bei Änderung der erlaubten Kategorien
 *
 * 2. **Domain-Logic Kapselung:**
 *    - Validierung ist Domain-Logik, nicht Infrastructure-Logik
 *    - Value Object isoliert diese Logik im Domain Layer
 *    - Type Alias kann KEINE Logik kapseln (nur Typ-Definition)
 *
 * 3. **Compile-Time Type Safety:**
 *    - TypeScript unterscheidet `QualifikationKategorie` von anderen String-basierten Value Objects
 *    - Verhindert versehentliches Vertauschen mit anderen Kategorien-Typen
 *
 * 4. **Explizite Fehlerbehandlung mit Result Pattern:**
 *    - Factory Method `create()` gibt `Result<QualifikationKategorie>` zurück
 *    - Caller kann Fehler ergonomisch mit `isFailure` und `.error` behandeln
 *    - Type Alias würde Exceptions oder boolean returns erfordern
 *
 * 5. **Erweiterbarkeit:**
 *    - Zukünftige Business Rules können als Methods hinzugefügt werden
 *    - Beispiel: `isLeadership()`, `requiresCertification()`, `getDisplayName()`
 *    - Type Alias kann KEINE Methods haben
 *
 * 6. **Testbarkeit:**
 *    - Validierungs-Logik ist isoliert testbar in einem Unit Test
 *    - Klar definierte Input/Output Contracts (Result Pattern)
 *
 * **Alternative (Type Alias):**
 * ```typescript
 * export type QualifikationKategorie = 'FUEHRUNG' | 'SANITAET' | ...;
 * ```
 * Probleme:
 * - Keine Runtime-Validierung
 * - Duplikation der Validierung in jedem Consumer (Aggregate, Command, DTO)
 * - Keine zentrale Error Messages
 * - Schwer zu refactoren (neue Kategorie = viele Dateien ändern)
 *
 * **Verwendung:**
 * ```typescript
 * // In Aggregate/Command/DTO
 * const kategorieResult = QualifikationKategorie.create('SANITAET');
 * if (kategorieResult.isFailure) {
 *   return Result.fail(kategorieResult.error);
 * }
 * const kategorie = kategorieResult.value; // QualifikationKategorie
 * ```
 *
 * @example
 * ```typescript
 * // Success Case
 * const kat = QualifikationKategorie.create('SANITAET');
 * console.log(kat.isSuccess); // true
 * console.log(kat.value.value); // 'SANITAET'
 *
 * // Failure Case
 * const invalid = QualifikationKategorie.create('INVALID');
 * console.log(invalid.isFailure); // true
 * console.log(invalid.error); // 'Ungültige Kategorie: INVALID. Erlaubt: ...'
 * ```
 */
export class QualifikationKategorie extends ValueObject<QualifikationKategorieProps> {
  /**
   * Erlaubte Kategorien für Validation (private, nur intern verwendet).
   * Nutzt die exportierte QUALIFIKATION_KATEGORIEN Konstante als Single Source of Truth.
   */
  private static readonly VALID_KATEGORIEN = QUALIFIKATION_KATEGORIEN;

  /**
   * Private Constructor erzwingt Nutzung der Factory Method `create()`.
   * Stellt sicher dass nur validierte Instanzen existieren können.
   *
   * @param props - Die Value Object Properties
   */
  private constructor(props: QualifikationKategorieProps) {
    super(props);
  }

  /**
   * Gibt den rohen ENUM-Wert zurück (z.B. 'SANITAET').
   */
  get value(): QualifikationKategorieType {
    return this.props.value;
  }

  /**
   * Factory Method mit Validation für neue QualifikationKategorie.
   *
   * Validiert dass der übergebene Wert einer der erlaubten ENUM-Werte ist.
   * Nutzt Result Pattern für explizite Fehlerbehandlung.
   *
   * @param value - Der zu validierende Kategoriewert
   * @returns Result<QualifikationKategorie> - Success mit Value Object oder Failure mit Error Message
   *
   * @example
   * ```typescript
   * const result = QualifikationKategorie.create('SANITAET');
   * if (result.isSuccess) {
   *   const kategorie = result.value; // QualifikationKategorie
   *   console.log(kategorie.value); // 'SANITAET'
   * } else {
   *   console.error(result.error); // Error Message
   * }
   * ```
   */
  static create(value: string): Result<QualifikationKategorie> {
    // Validation: Kategorie muss in erlaubten Werten sein
    if (!QualifikationKategorie.VALID_KATEGORIEN.includes(value as QualifikationKategorieType)) {
      return Result.fail<QualifikationKategorie>(`Ungültige Kategorie: ${value}. Erlaubt: ${QualifikationKategorie.VALID_KATEGORIEN.join(', ')}`);
    }

    return Result.ok<QualifikationKategorie>(new QualifikationKategorie({ value: value as QualifikationKategorieType }));
  }

  /**
   * String-Repräsentation für Logging und Debugging.
   *
   * @returns Der ENUM-Wert als String (z.B. 'SANITAET')
   */
  toString(): string {
    return this.value;
  }
}
