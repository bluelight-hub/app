import { Result } from '@domain/common/result';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { FunkPrioritaet } from '@domain/value-objects/funk-prioritaet';
import type { FunkPrioritaetValue } from '@domain/value-objects/funk-prioritaet';

/**
 * Eingabeform eines EintragKontext am Command-API-Rand.
 *
 * Das Value Object wird erst im Handler erzeugt, damit das Command
 * serialisierbar (POJO) bleibt.
 */
export type AddEintragCommandKontext = { type: 'standard' } | { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkPrioritaetValue };

/**
 * Command zum Hinzufügen eines neuen Eintrags zum Einsatztagebuch.
 *
 * Diese Command enthält alle Daten für einen neuen ETB-Eintrag:
 * - etbId: ID des Ziel-ETBs
 * - text: Textinhalt des Eintrags
 * - userId: ID des erstellenden Users (für Audit-Trail)
 * - kategorie: Kategorie des Eintrags (optional, Default: LAGE)
 *
 * Die Sequenznummer wird automatisch vom Aggregate vergeben (auto-increment).
 *
 * @example
 * ```typescript
 * const commandResult = AddEintragCommand.create(
 *   'clx1234567890abcdefghijk', // ETB-ID
 *   'Fahrzeug W1 am Einsatzort eingetroffen',
 *   'clx_user_abc123def456', // User-ID
 *   'ANKUNFT' // Optional: Kategorie
 * );
 * if (commandResult.isSuccess) {
 *   const eintrag = await commandBus.execute(commandResult.value);
 * }
 * ```
 */
export class AddEintragCommand {
  /**
   * Privater Konstruktor - erzwingt Verwendung der Factory-Methode.
   *
   * @param etbId - ID des Einsatztagebuchs (CUID2-Format)
   * @param text - Textinhalt des neuen Eintrags
   * @param userId - ID des erstellenden Users (CUID2-Format)
   * @param kategorie - Kategorie des Eintrags (Default: LAGE)
   * @param einsatzId - Optional: Einsatz-ID für automatische ETB-Erstellung
   * @param absender - Optional: Absender des Eintrags (z.B. Funkrufname)
   * @param empfaenger - Optional: Empfänger des Eintrags (z.B. LST)
   * @param metadata - Optional: Metadaten (z.B. Screenshots)
   * @param occurredAt - Optional: Zeitpunkt des Auftretens (Default: aktuelle Server-Zeit)
   */
  private constructor(
    public readonly etbId: string,
    public readonly text: string,
    public readonly userId: string,
    public readonly kategorie: EtbKategorieValue = 'LAGE',
    public readonly einsatzId?: string,
    public readonly absender?: string,
    public readonly empfaenger?: string,
    public readonly metadata: Record<string, unknown> = {},
    public readonly occurredAt?: Date,
    public readonly ereignisZeitpunkt?: Date,
    public readonly kontext?: AddEintragCommandKontext,
  ) {}

  /**
   * Factory-Methode für AddEintragCommand mit Validierung.
   *
   * Validiert alle erforderlichen Felder. Die Format-Validierung (CUID2)
   * erfolgt im Handler bei Value Object Creation.
   *
   * @param etbId - ID des ETBs, zu dem der Eintrag hinzugefügt wird
   * @param text - Textinhalt des Eintrags (darf nicht leer sein)
   * @param userId - ID des Users, der den Eintrag erstellt
   * @param kategorie - Kategorie des Eintrags (optional, Default: LAGE)
   * @param einsatzId - Optional: Einsatz-ID für automatische ETB-Erstellung
   * @param absender - Optional: Absender des Eintrags (z.B. Funkrufname)
   * @param empfaenger - Optional: Empfänger des Eintrags (z.B. LST)
   * @param metadata - Optional: Metadaten (z.B. Screenshots, Anhänge)
   * @param occurredAt - Optional: Zeitpunkt des Auftretens (Default: aktuelle Server-Zeit)
   * @returns Result mit validiertem Command oder Fehlermeldung
   */
  public static create(
    etbId: string,
    text: string,
    userId: string,
    kategorie?: EtbKategorieValue,
    einsatzId?: string,
    absender?: string,
    empfaenger?: string,
    metadata: Record<string, unknown> = {},
    occurredAt?: Date,
    ereignisZeitpunkt?: Date,
    kontext?: AddEintragCommandKontext,
  ): Result<AddEintragCommand> {
    // Validation: etbId required
    if (!etbId || etbId.trim().length === 0) {
      return Result.fail('etbId is required');
    }

    // Validation: text required and not empty
    if (!text || text.trim().length === 0) {
      return Result.fail('text is required and cannot be empty');
    }

    // Validation: userId required
    if (!userId || userId.trim().length === 0) {
      return Result.fail('userId is required');
    }

    // Validation: einsatzId optional, but if provided must not be empty
    if (einsatzId !== undefined && einsatzId.trim().length === 0) {
      return Result.fail('einsatzId cannot be empty when provided');
    }

    // Validation: absender max length
    if (absender && absender.length > 100) {
      return Result.fail('absender cannot exceed 100 characters');
    }

    // Validation: empfaenger max length
    if (empfaenger && empfaenger.length > 100) {
      return Result.fail('empfaenger cannot exceed 100 characters');
    }

    // Validation: Kontext (Issue #407)
    if (kontext?.type === 'funkspruch') {
      if (!kontext.kanalId || kontext.kanalId.trim().length === 0) {
        return Result.fail('kontext.kanalId ist erforderlich bei type=funkspruch');
      }
      const prioResult = FunkPrioritaet.create(kontext.funkPrioritaet);
      if (prioResult.isFailure) {
        return Result.fail(prioResult.error ?? 'Ungültige FunkPrioritaet');
      }
    }

    return Result.ok(new AddEintragCommand(etbId, text, userId, kategorie ?? 'LAGE', einsatzId, absender, empfaenger, metadata, occurredAt, ereignisZeitpunkt, kontext));
  }
}
