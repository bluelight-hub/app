import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

/**
 * Prisma ENUM Typ für Fahrzeugtyp-Kategorien.
 * Muss konsistent mit schema.prisma bleiben.
 */
export type FahrzeugtypKategorieType = 'TRANSPORT' | 'EINSATZ' | 'SPEZIAL' | 'LOGISTIK' | 'SONSTIGES';

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
export const FAHRZEUGTYP_KATEGORIEN: readonly FahrzeugtypKategorieType[] = ['TRANSPORT', 'EINSATZ', 'SPEZIAL', 'LOGISTIK', 'SONSTIGES'] as const;

/**
 * Props Interface für FahrzeugtypKategorie Value Object.
 */
interface FahrzeugtypKategorieProps extends Record<string, unknown> {
  value: FahrzeugtypKategorieType;
}

/**
 * FahrzeugtypKategorie Value Object mit zentralisierter Domain-Validierung.
 *
 * Kapselt die Business Rules für Fahrzeugtyp-Kategorien:
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
 *    - TypeScript unterscheidet `FahrzeugtypKategorie` von anderen String-basierten Value Objects
 *    - Verhindert versehentliches Vertauschen mit anderen Kategorien-Typen
 *
 * 4. **Explizite Fehlerbehandlung mit Result Pattern:**
 *    - Factory Method `create()` gibt `Result<FahrzeugtypKategorie>` zurück
 *    - Caller kann Fehler ergonomisch mit `isFailure` und `.error` behandeln
 *    - Type Alias würde Exceptions oder boolean returns erfordern
 *
 * 5. **Erweiterbarkeit:**
 *    - Zukünftige Business Rules können als Methods hinzugefügt werden
 *    - Beispiel: `isEmergencyVehicle()`, `requiresSpecialLicense()`, `getDisplayName()`
 *    - Type Alias kann KEINE Methods haben
 *
 * 6. **Testbarkeit:**
 *    - Validierungs-Logik ist isoliert testbar in einem Unit Test
 *    - Klar definierte Input/Output Contracts (Result Pattern)
 *
 * **Alternative (Type Alias):**
 * ```typescript
 * export type FahrzeugtypKategorie = 'TRANSPORT' | 'EINSATZ' | ...;
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
 * const kategorieResult = FahrzeugtypKategorie.create('EINSATZ');
 * if (kategorieResult.isFailure) {
 *   return Result.fail(kategorieResult.error);
 * }
 * const kategorie = kategorieResult.value; // FahrzeugtypKategorie
 * ```
 *
 * @example
 * ```typescript
 * // Success Case
 * const kat = FahrzeugtypKategorie.create('EINSATZ');
 * console.log(kat.isSuccess); // true
 * console.log(kat.value.value); // 'EINSATZ'
 *
 * // Failure Case
 * const invalid = FahrzeugtypKategorie.create('INVALID');
 * console.log(invalid.isFailure); // true
 * console.log(invalid.error); // 'Ungültige Kategorie: INVALID. Erlaubt: ...'
 * ```
 */
export class FahrzeugtypKategorie extends ValueObject<FahrzeugtypKategorieProps> {
  /**
   * Erlaubte Kategorien für Validation (private, nur intern verwendet).
   * Nutzt die exportierte FAHRZEUGTYP_KATEGORIEN Konstante als Single Source of Truth.
   */
  private static readonly VALID_KATEGORIEN = FAHRZEUGTYP_KATEGORIEN;

  /**
   * Private Constructor erzwingt Nutzung der Factory Method `create()`.
   * Stellt sicher dass nur validierte Instanzen existieren können.
   *
   * @param props - Die Value Object Properties
   */
  private constructor(props: FahrzeugtypKategorieProps) {
    super(props);
  }

  /**
   * Gibt den rohen ENUM-Wert zurück (z.B. 'EINSATZ').
   */
  get value(): FahrzeugtypKategorieType {
    return this.props.value;
  }

  /**
   * Factory Method mit Validation für neue FahrzeugtypKategorie.
   *
   * Validiert dass der übergebene Wert einer der erlaubten ENUM-Werte ist.
   * Nutzt Result Pattern für explizite Fehlerbehandlung.
   *
   * @param value - Der zu validierende Kategoriewert
   * @returns Result<FahrzeugtypKategorie> - Success mit Value Object oder Failure mit Error Message
   *
   * @example
   * ```typescript
   * const result = FahrzeugtypKategorie.create('EINSATZ');
   * if (result.isSuccess) {
   *   const kategorie = result.value; // FahrzeugtypKategorie
   *   console.log(kategorie.value); // 'EINSATZ'
   * } else {
   *   console.error(result.error); // Error Message
   * }
   * ```
   */
  static create(value: string): Result<FahrzeugtypKategorie> {
    // Validation: Kategorie muss in erlaubten Werten sein
    if (!FahrzeugtypKategorie.VALID_KATEGORIEN.includes(value as FahrzeugtypKategorieType)) {
      return Result.fail<FahrzeugtypKategorie>(`Ungültige Kategorie: ${value}. Erlaubt: ${FahrzeugtypKategorie.VALID_KATEGORIEN.join(', ')}`);
    }

    return Result.ok<FahrzeugtypKategorie>(new FahrzeugtypKategorie({ value: value as FahrzeugtypKategorieType }));
  }

  /**
   * String-Repräsentation für Logging und Debugging.
   *
   * @returns Der ENUM-Wert als String (z.B. 'EINSATZ')
   */
  toString(): string {
    return this.value;
  }
}
