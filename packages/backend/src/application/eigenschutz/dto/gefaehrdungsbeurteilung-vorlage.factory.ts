import type { GefaehrdungsbeurteilungVorlageReadModel } from '@domain/eigenschutz/repositories';
import { toGefaehrdungItemDto } from './gefaehrdung-item.factory';
import { GefaehrdungsbeurteilungVorlageDto } from './gefaehrdungsbeurteilung-vorlage.dto';

/**
 * Mapped das Read-Model aus dem Vorlagen-Repository auf das Response-DTO.
 */
export function toGefaehrdungsbeurteilungVorlageDto(model: GefaehrdungsbeurteilungVorlageReadModel): GefaehrdungsbeurteilungVorlageDto {
  const dto = new GefaehrdungsbeurteilungVorlageDto();
  dto.id = model.id;
  dto.slug = model.slug;
  dto.name = model.name;
  dto.szenario = model.szenario;
  dto.items = model.items.map(toGefaehrdungItemDto);
  dto.version = model.version;
  dto.aktiv = model.aktiv;
  dto.erstelltAm = model.erstelltAm.toISOString();
  return dto;
}
