import { Result } from '@domain/common/result';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

/**
 * Command zum Erstellen eines Korrektur-Eintrags fuer einen bestehenden ETB-Eintrag.
 *
 * ETB-Eintraege sind nach Erstellung unveraenderlich (Issue #554).
 * Korrekturen werden als neue Eintraege mit Referenz auf den Original-Eintrag erstellt.
 */
export class AddKorrekturEintragCommand {
  private constructor(
    public readonly etbId: string,
    public readonly originalEintragId: string,
    public readonly text: string,
    public readonly userId: string,
    public readonly kategorie?: EtbKategorieValue,
    public readonly absender?: string,
    public readonly empfaenger?: string,
    public readonly metadata: Record<string, unknown> = {},
    public readonly occurredAt?: Date,
  ) {}

  public static create(
    etbId: string,
    originalEintragId: string,
    text: string,
    userId: string,
    kategorie?: EtbKategorieValue,
    absender?: string,
    empfaenger?: string,
    metadata: Record<string, unknown> = {},
    occurredAt?: Date,
  ): Result<AddKorrekturEintragCommand> {
    if (!etbId || etbId.trim().length === 0) {
      return Result.fail('etbId is required');
    }
    if (!originalEintragId || originalEintragId.trim().length === 0) {
      return Result.fail('originalEintragId is required');
    }
    if (!text || text.trim().length === 0) {
      return Result.fail('text is required and cannot be empty');
    }
    if (!userId || userId.trim().length === 0) {
      return Result.fail('userId is required');
    }
    if (absender && absender.length > 100) {
      return Result.fail('absender cannot exceed 100 characters');
    }
    if (empfaenger && empfaenger.length > 100) {
      return Result.fail('empfaenger cannot exceed 100 characters');
    }

    return Result.ok(new AddKorrekturEintragCommand(etbId, originalEintragId, text, userId, kategorie, absender, empfaenger, metadata, occurredAt));
  }
}
