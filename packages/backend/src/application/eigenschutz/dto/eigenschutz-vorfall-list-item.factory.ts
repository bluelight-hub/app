import type { VorfallListReadRow } from '@domain/eigenschutz/repositories';
import { EigenschutzVorfallListItemDto } from './eigenschutz-vorfall-list-item.dto';

/**
 * Factory `VorfallListReadRow` → `EigenschutzVorfallListItemDto`
 * (Story 5.3, AC3). Wandelt `Date`-Felder zu ISO-8601-Strings, reicht
 * **keinen** `kontextSnapshot` durch — der existiert auf der Read-Row
 * gar nicht erst.
 */
export function toEigenschutzVorfallListItemDto(row: VorfallListReadRow): EigenschutzVorfallListItemDto {
  const dto = new EigenschutzVorfallListItemDto();
  dto.id = row.id;
  dto.einheitId = row.einheitId;
  dto.vorfallZeit = row.vorfallZeit.toISOString();
  dto.was = row.was;
  dto.unfallkasseRelevant = row.unfallkasseRelevant;
  dto.erfasstAm = row.erfasstAm.toISOString();
  dto.erfasstVonUserId = row.erfasstVonUserId;
  return dto;
}
