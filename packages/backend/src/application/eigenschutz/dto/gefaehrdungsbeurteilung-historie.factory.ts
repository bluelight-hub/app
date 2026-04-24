import type { HistorieEintragReadModel, HistorieReadModel } from '@/application/eigenschutz/queries/get-gefaehrdungsbeurteilung-historie/get-gefaehrdungsbeurteilung-historie.handler';
import { toGefaehrdungItemDto } from './gefaehrdung-item.factory';
import { GefaehrdungsbeurteilungHistorieEintragDto } from './gefaehrdungsbeurteilung-historie-eintrag.dto';
import { GefaehrdungsbeurteilungHistorieDto } from './gefaehrdungsbeurteilung-historie.dto';

/**
 * Mapped einen einzelnen Historie-Read-Model-Eintrag auf das Response-DTO.
 * Die Items werden über die bestehende `toGefaehrdungItemDto`-Factory auf
 * die gleiche Shape gebracht wie im Haupt-Endpoint (`GET …/:id`).
 */
function toHistorieEintragDto(eintrag: HistorieEintragReadModel): GefaehrdungsbeurteilungHistorieEintragDto {
  const dto = new GefaehrdungsbeurteilungHistorieEintragDto();
  dto.version = eintrag.version;
  dto.gueltigVon = eintrag.gueltigVon.toISOString();
  dto.gueltigBis = eintrag.gueltigBis ? eintrag.gueltigBis.toISOString() : null;
  dto.changedByUserId = eintrag.changedByUserId;
  dto.changedByUserName = eintrag.changedByUserName;
  dto.changedFields = eintrag.changedFields;
  dto.items = eintrag.items.map(toGefaehrdungItemDto);
  return dto;
}

/**
 * Baut das Historie-Response-DTO aus dem Handler-Read-Model (Story 2.4).
 */
export function toHistorieDto(readModel: HistorieReadModel): GefaehrdungsbeurteilungHistorieDto {
  const dto = new GefaehrdungsbeurteilungHistorieDto();
  dto.aggregateVersion = readModel.aggregateVersion;
  dto.eintraege = readModel.eintraege.map(toHistorieEintragDto);
  return dto;
}
