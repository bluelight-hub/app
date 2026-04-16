import { BadRequestException, ConflictException, HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Result } from '@domain/common/result';

/**
 * Übersetzt einen Domain/Command-`Result.fail`-String in eine HTTP-Exception
 * für den Alarmierungs-Bounded-Context (Issue #408).
 *
 * Konventionen (analog Funkkanal):
 * - Text enthält "nicht gefunden" / "not found" → 404 Not Found
 * - Text enthält "bereits zugeordnet" / "bereits abgeschlossen"
 *   / "existiert bereits" / "bereits vergeben" → 409 Conflict
 * - Text enthält "abgeschlossen" / "darf nicht vor"
 *   / "gehört nicht zum" → 422 Unprocessable Entity (Invariante verletzt)
 * - sonst → 400 Bad Request
 */
export function toHttpError(message: string | undefined): HttpException {
  const text = (message ?? 'Unbekannter Fehler').toLowerCase();

  if (text.includes('nicht gefunden') || text.includes('not found')) {
    return new NotFoundException(message);
  }

  if (text.includes('bereits zugeordnet') || text.includes('bereits abgeschlossen') || text.includes('existiert bereits') || text.includes('bereits vergeben')) {
    return new ConflictException(message);
  }

  if (text.includes('abgeschlossen') || text.includes('darf nicht vor') || text.includes('gehört nicht zum')) {
    return new UnprocessableEntityException(message);
  }

  return new BadRequestException(message);
}

/**
 * Entpackt ein Command/Query-Result, oder wirft die passende HTTP-Exception.
 */
export function unwrapOrThrow<T>(result: Result<T>): T {
  if (result.isFailure) {
    throw toHttpError(result.error);
  }
  return result.value as T;
}
