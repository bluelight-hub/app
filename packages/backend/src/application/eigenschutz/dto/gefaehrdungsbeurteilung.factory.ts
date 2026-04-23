import type { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { toGefaehrdungItemDto } from './gefaehrdung-item.factory';
import { GefaehrdungsbeurteilungDto } from './gefaehrdungsbeurteilung.dto';

/**
 * Mapped ein Aggregate plus Persistenz-Metadaten auf das Response-DTO.
 *
 * Das Aggregate selbst kennt `erstelltAm` / `aktualisiertAm` / `aktualisiertVon`
 * aktuell nicht — diese Felder stammen aus dem Prisma-Row. Darum übergibt der
 * Aufrufer (Controller oder Read-Model-Handler) sie explizit.
 */
export function toGefaehrdungsbeurteilungDto(args: { aggregate: Gefaehrdungsbeurteilung; erstelltAm: Date; aktualisiertAm: Date; aktualisiertVonUserId: string }): GefaehrdungsbeurteilungDto {
  const { aggregate } = args;
  const dto = new GefaehrdungsbeurteilungDto();
  dto.id = aggregate.id.value;
  dto.einsatzId = aggregate.einsatzId;
  dto.einheitId = aggregate.einheitId;
  dto.vorlageId = aggregate.vorlageId;
  dto.gefahrenzoneId = aggregate.gefahrenzoneId;
  dto.items = aggregate.items.map(toGefaehrdungItemDto);
  dto.version = aggregate.version;
  dto.erstelltAm = args.erstelltAm.toISOString();
  dto.erstelltVonUserId = aggregate.createdBy;
  dto.aktualisiertAm = args.aktualisiertAm.toISOString();
  dto.aktualisiertVonUserId = args.aktualisiertVonUserId;
  return dto;
}
