/**
 * Error Codes für Rollenbesetzung Domain Logic.
 *
 * Definiert typsichere Error-Konstanten für Business Rule Violations.
 * Verwendet als `Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT)`
 * statt Exception-Throwing für erwartete Business-Fehler.
 *
 * **Pattern:** as const für readonly String Literal Types
 *
 * @example
 * ```typescript
 * // In Domain Entity oder Command Handler
 * if (existingBesetzung) {
 *   return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT);
 * }
 *
 * // In Controller (Error Translation)
 * if (result.isFailure) {
 *   switch (result.error) {
 *     case ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT:
 *       throw new ConflictException('Rolle bereits besetzt');
 *     case ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED:
 *       throw new BadRequestException('Person nicht qualifiziert');
 *   }
 * }
 * ```
 */
export const ROLLEN_BESETZUNG_ERROR_CODES = {
  /**
   * Rolle ist bereits im Einsatz besetzt (AC2: UNIQUE Constraint Violation).
   *
   * **Trigger:** Attempt to assign a role that is already filled in this Einsatz.
   * **Business Rule:** Eine Rolle kann pro Einsatz nur EINMAL besetzt werden.
   */
  ROLLE_ALREADY_BESETZT: 'ROLLE_ALREADY_BESETZT',

  /**
   * Person nicht gefunden (FK Constraint Violation).
   *
   * **Trigger:** personId does not exist in EinsatzPerson table.
   * **HTTP:** 404 Not Found
   */
  PERSON_NOT_FOUND: 'PERSON_NOT_FOUND',

  /**
   * RollenDefinition nicht gefunden (FK Constraint Violation).
   *
   * **Trigger:** rollenDefinitionId does not exist or is inactive.
   * **HTTP:** 404 Not Found
   */
  ROLLE_NOT_FOUND: 'ROLLE_NOT_FOUND',

  /**
   * Person besitzt nicht alle erforderlichen Qualifikationen für die Rolle.
   *
   * **Trigger:** Person.qualifikationen does not include all required qualifications from RollenDefinition.
   * **Business Rule:** Person MUSS alle Pflicht-Qualifikationen (istPflicht=true) haben.
   * **HTTP:** 400 Bad Request
   */
  PERSON_NOT_QUALIFIED: 'PERSON_NOT_QUALIFIED',

  /**
   * Einsatz-Kontext ungültig (z.B. Einsatz bereits abgeschlossen).
   *
   * **Trigger:** Attempt to assign role to completed/archived Einsatz.
   * **Business Rule:** Rollenbesetzung nur für aktive Einsätze erlaubt.
   * **HTTP:** 400 Bad Request
   */
  INVALID_EINSATZ_CONTEXT: 'INVALID_EINSATZ_CONTEXT',
} as const;

/**
 * Type Helper: Union Type aller Error Codes.
 *
 * Erlaubt Type-Safe Switch-Cases und Exhaustiveness Checking.
 */
export type RollenBesetzungErrorCode = (typeof ROLLEN_BESETZUNG_ERROR_CODES)[keyof typeof ROLLEN_BESETZUNG_ERROR_CODES];
