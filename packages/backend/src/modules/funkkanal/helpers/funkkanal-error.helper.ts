import { BadRequestException, ConflictException, HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Result } from '@domain/common/result';

/**
 * Übersetzt einen Domain/Command-`Result.fail`-String in eine HTTP-Exception.
 *
 * Konventionen (siehe Plan, Task 20):
 * - Text enthält "existiert bereits" / "bereits vergeben" → 409 Conflict
 * - Text enthält "nicht gefunden" / "not found" → 404 Not Found
 * - Text enthält "archiviert" / "referenziert" → 422 Unprocessable Entity
 * - sonst → 400 Bad Request
 */
export function toHttpError(message: string | undefined): HttpException {
  const text = (message ?? 'Unbekannter Fehler').toLowerCase();
  if (text.includes('nicht gefunden') || text.includes('not found')) {
    return new NotFoundException(message);
  }
  if (
    text.includes('bereits vergeben') ||
    text.includes('existiert bereits') ||
    text.includes('bereits archiviert') ||
    text.includes('bereits aktiv') ||
    text.includes('bereits inaktiv') ||
    (text.includes('bereits') && text.includes('zugeordnet'))
  ) {
    return new ConflictException(message);
  }
  if (text.includes('archiviert') || text.includes('referenziert')) {
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
