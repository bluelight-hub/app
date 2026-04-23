import type { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import { GefaehrdungItemDto } from './gefaehrdung-item.dto';

/**
 * Mapped ein Domain-`GefaehrdungItem` auf das Response-DTO. Es werden nur
 * gesetzte Felder übertragen — konsistent mit `GefaehrdungItem#toJSON`.
 */
export function toGefaehrdungItemDto(item: GefaehrdungItem): GefaehrdungItemDto {
  const dto = new GefaehrdungItemDto();
  const raw = item.toJSON();
  if (raw.id !== undefined) dto.id = raw.id;
  dto.title = raw.title;
  if (raw.description !== undefined) dto.description = raw.description;
  if (raw.eintritt !== undefined) dto.eintritt = raw.eintritt;
  if (raw.schaden !== undefined) dto.schaden = raw.schaden;
  if (raw.risikoklasse !== undefined) dto.risikoklasse = raw.risikoklasse;
  if (raw.schutzmassnahmen !== undefined) dto.schutzmassnahmen = raw.schutzmassnahmen;
  return dto;
}
