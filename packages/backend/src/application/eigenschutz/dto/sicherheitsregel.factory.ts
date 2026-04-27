import type { SicherheitsregelReadModel } from '@domain/eigenschutz/repositories/i-sicherheitsregel.repository';
import { SicherheitsregelDto } from './sicherheitsregel.dto';

/**
 * Mapped ein {@link SicherheitsregelReadModel} (Aggregate + Persistenz-
 * Metadaten + `propagationGroupId`) auf das Response-DTO (Story 2.6 AC6).
 *
 * Das `einsatzweit`-Flag wird deterministisch aus `einheitId === null`
 * abgeleitet — konsistent zum Aggregate-Getter und zur Shared-Zod-Union.
 */
export function toSicherheitsregelDto(readModel: SicherheitsregelReadModel): SicherheitsregelDto {
  const { aggregate } = readModel;
  const dto = new SicherheitsregelDto();
  dto.id = aggregate.id.value;
  dto.einsatzId = aggregate.einsatzId;
  dto.einheitId = aggregate.einheitId;
  dto.einsatzweit = aggregate.einsatzweit;
  dto.titel = aggregate.titel;
  dto.inhalt = aggregate.inhalt;
  dto.version = aggregate.version;
  dto.erstelltAm = readModel.erstelltAm.toISOString();
  dto.erstelltVonUserId = aggregate.erstelltVonUserId;
  dto.aktualisiertAm = readModel.aktualisiertAm.toISOString();
  dto.aktualisiertVonUserId = readModel.aktualisiertVonUserId;
  dto.propagationGroupId = readModel.propagationGroupId;
  return dto;
}
