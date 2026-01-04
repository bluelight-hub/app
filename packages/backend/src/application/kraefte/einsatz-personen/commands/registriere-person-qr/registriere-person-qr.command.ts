import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Regex für Script-Injection Erkennung.
 *
 * Blockiert gefährliche Zeichen/Patterns aber erlaubt:
 * - Umlaute (äöüÄÖÜß)
 * - Bindestriche, Apostrophe, Leerzeichen (für Namen)
 * - Zahlen und Buchstaben
 *
 * Schutzmechanismen:
 * - XSS: <, >, &lt;, &gt;, javascript:, data:, vbscript:
 * - Event Handlers: on\w+=
 * - NULL Bytes: %00
 * - CRLF Injection: %0d, %0a
 * - Unicode Homoglyphs: ＜ (U+FF1C), ＞ (U+FF1E), ﹤ (U+FE64), ﹥ (U+FE65)
 * - SQL Injection: '; DROP, DELETE, UPDATE, INSERT, UNION, SELECT, --, /*
 *
 * SECURITY FIX: Verwendet [;\s]* statt \s*;?\s* um ReDoS zu verhindern.
 * Das alte Pattern hatte polynomial Backtracking bei Input wie "' " (Apostroph + Leerzeichen).
 */
const DANGEROUS_PATTERN = /[<>]|&lt;|&gt;|javascript:|data:|vbscript:|on\w+=|%00|%0[ad]|[\uFF1C\uFF1E\uFE64\uFE65]|'[;\s]*(?:DROP|DELETE|UPDATE|INSERT|UNION|SELECT|--|\/\*)/i;

/**
 * Prüft ob ein String gefährliche Zeichen/Patterns enthält.
 *
 * Diese Funktion schützt gegen XSS, Script-Injection und SQL-Injection-Angriffe.
 * Wird für alle QR-Code-Daten verwendet, da diese von externen Geräten stammen.
 *
 * @example
 * // XSS Angriffe werden blockiert
 * containsDangerousContent('<script>alert(1)</script>') // true
 * containsDangerousContent('onerror=alert(1)') // true
 *
 * // Normale Namen werden erlaubt
 * containsDangerousContent('Hans-Peter') // false
 * containsDangerousContent("O'Brien") // false
 * containsDangerousContent('Müller') // false
 *
 * // Unicode Homoglyphs werden blockiert
 * containsDangerousContent('＜script＞') // true
 *
 * // SQL Injection wird blockiert
 * containsDangerousContent("'; DROP TABLE") // true
 *
 * @param input - Zu prüfende Eingabe
 * @returns true wenn gefährliche Pattern gefunden wurden
 */
function containsDangerousContent(input: string): boolean {
  // Check for NULL bytes separately (cannot use \x00 in regex due to linter)
  if (input.includes('\0')) {
    return true;
  }
  return DANGEROUS_PATTERN.test(input);
}

/**
 * Command zur Registrierung einer Person via QR-Code (DRK-App Format).
 *
 * Der QR-Code enthält die Personalnummer (mnr), Vorname (vn), Nachname (nn)
 * und optional die Funkkennung (fk). Die Personalnummer wird für den
 * Stammdaten-Lookup verwendet (falls vorhanden).
 *
 * @see docs/sprint-artifacts/4-2-person-via-qr-code-registrieren.md
 */
export class RegistrierePersonViaQrCodeCommand {
  private constructor(
    /** Einsatz-ID zu dem die Person registriert wird (UUID) */
    public readonly einsatzId: string,
    /** Personalnummer aus QR-Code (DRK: "mnr" Parameter) */
    public readonly personalnummer: string,
    /** Vorname aus QR-Code (DRK: "vn" Parameter) */
    public readonly vorname: string,
    /** Nachname aus QR-Code (DRK: "nn" Parameter) */
    public readonly nachname: string,
    /** BOS-Funkkennung aus QR-Code (DRK: "fk" Parameter, optional) */
    public readonly funkkennung: string | undefined,
    /** User-ID der die Person registriert (CUID2, Audit-Trail) */
    public readonly registriertVon: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * Validiert QR-Daten und erstellt Command.
   * Personalnummer wird später für StammPerson-Lookup verwendet.
   *
   * **ISSUE #12 FIX:** Personalnummer wird zu uppercase normalisiert für case-insensitive Vergleiche.
   *
   * @param props - Command Properties aus QR-Code
   * @returns Result<RegistrierePersonViaQrCodeCommand>
   */
  static create(props: { einsatzId: string; personalnummer: string; vorname: string; nachname: string; funkkennung?: string; registriertVon: string }): Result<RegistrierePersonViaQrCodeCommand> {
    // Validation: einsatzId (erforderlich)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    // Validation: einsatzId format (UUID or CUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!isCuid(trimmedEinsatzId) && !uuidRegex.test(trimmedEinsatzId)) {
      return Result.fail('einsatzId muss ein gueltiger UUID oder CUID sein');
    }

    // Validation: personalnummer (erforderlich, aus QR "mnr")
    // ISSUE #12 FIX: Normalisiere zu uppercase für case-insensitive Lookups
    const trimmedPersonalnummer = (props.personalnummer?.trim() ?? '').toUpperCase();
    if (trimmedPersonalnummer.length === 0) {
      return Result.fail('Personalnummer ist erforderlich');
    }
    if (trimmedPersonalnummer.length > 50) {
      return Result.fail('Personalnummer darf maximal 50 Zeichen lang sein');
    }
    if (containsDangerousContent(trimmedPersonalnummer)) {
      return Result.fail('Personalnummer enthält ungültige Zeichen');
    }

    // Validation: vorname (erforderlich)
    const trimmedVorname = props.vorname?.trim() ?? '';
    if (trimmedVorname.length === 0) {
      return Result.fail('Vorname ist erforderlich');
    }
    if (trimmedVorname.length > 100) {
      return Result.fail('Vorname darf maximal 100 Zeichen lang sein');
    }
    if (containsDangerousContent(trimmedVorname)) {
      return Result.fail('Vorname enthält ungültige Zeichen');
    }

    // Validation: nachname (erforderlich)
    const trimmedNachname = props.nachname?.trim() ?? '';
    if (trimmedNachname.length === 0) {
      return Result.fail('Nachname ist erforderlich');
    }
    if (trimmedNachname.length > 100) {
      return Result.fail('Nachname darf maximal 100 Zeichen lang sein');
    }
    if (containsDangerousContent(trimmedNachname)) {
      return Result.fail('Nachname enthält ungültige Zeichen');
    }

    // Validation: funkkennung (optional)
    let trimmedFunkkennung: string | undefined = props.funkkennung?.trim();
    if (trimmedFunkkennung && trimmedFunkkennung.length > 50) {
      return Result.fail('Funkkennung darf maximal 50 Zeichen lang sein');
    }
    if (trimmedFunkkennung && containsDangerousContent(trimmedFunkkennung)) {
      return Result.fail('Funkkennung enthält ungültige Zeichen');
    }
    if (trimmedFunkkennung !== undefined && trimmedFunkkennung.length === 0) {
      trimmedFunkkennung = undefined;
    }

    // Validation: registriertVon (CUID2 Format)
    const trimmedRegistriertVon = props.registriertVon?.trim() ?? '';
    if (trimmedRegistriertVon.length === 0) {
      return Result.fail('registriertVon ist erforderlich');
    }
    if (!isCuid(trimmedRegistriertVon)) {
      return Result.fail('registriertVon muss ein gueltiger CUID2-Identifier sein');
    }

    return Result.ok(new RegistrierePersonViaQrCodeCommand(trimmedEinsatzId, trimmedPersonalnummer, trimmedVorname, trimmedNachname, trimmedFunkkennung, trimmedRegistriertVon));
  }
}
