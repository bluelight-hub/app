import type { SicherheitsregelQuittungReadModel } from '@domain/eigenschutz/repositories/i-sicherheitsregel-quittung.repository';
import { SicherheitsregelQuittungDto } from './sicherheitsregel-quittung.dto';

/**
 * Factory: Read-Model → API-DTO für eine `SicherheitsregelQuittung` (Story 2.7).
 *
 * `quittiertVonUserName` ist Phase-2-Enrichment — wenn der Caller einen
 * User-Name-Lookup vorgenommen hat, kann er ihn separat einhängen. Ohne
 * Lookup bleibt das Feld undefined und das Frontend rendert eine User-ID-
 * Fallback-Pille.
 */
export class SicherheitsregelQuittungFactory {
  static toDto(readModel: SicherheitsregelQuittungReadModel, quittiertVonUserName?: string): SicherheitsregelQuittungDto {
    const dto = new SicherheitsregelQuittungDto();
    dto.einheitId = readModel.einheitId;
    dto.einheitName = readModel.einheitName;
    dto.quittiertAm = readModel.quittiertAm.toISOString();
    dto.quittiertVonUserId = readModel.quittiertVonUserId;
    if (quittiertVonUserName !== undefined) {
      dto.quittiertVonUserName = quittiertVonUserName;
    }
    return dto;
  }
}
