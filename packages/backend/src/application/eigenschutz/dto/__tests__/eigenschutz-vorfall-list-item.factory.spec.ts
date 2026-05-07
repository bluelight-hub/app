import type { VorfallListReadRow } from '@domain/eigenschutz/repositories';
import { toEigenschutzVorfallListItemDto } from '../eigenschutz-vorfall-list-item.factory';

describe('toEigenschutzVorfallListItemDto (Story 5.3 AC3)', () => {
  const baseRow: VorfallListReadRow = {
    id: 'clw3h8x9y0000qwertyui05101',
    einsatzId: 'clw3h8x9y0000qwertyui05001',
    einheitId: 'clw3h8x9y0000qwertyui05002',
    vorfallZeit: new Date('2026-05-06T10:00:00.000Z'),
    was: 'Sturz beim Aufbau',
    unfallkasseRelevant: true,
    erfasstAm: new Date('2026-05-06T10:01:23.456Z'),
    erfasstVonUserId: 'clw3h8x9y0000qwertyui05003',
  };

  it('(F1) mappt alle Felder 1:1 inkl. ISO-String-Konversion', () => {
    const dto = toEigenschutzVorfallListItemDto(baseRow);

    expect(dto).toEqual({
      id: baseRow.id,
      einheitId: baseRow.einheitId,
      vorfallZeit: '2026-05-06T10:00:00.000Z',
      was: 'Sturz beim Aufbau',
      unfallkasseRelevant: true,
      erfasstAm: '2026-05-06T10:01:23.456Z',
      erfasstVonUserId: baseRow.erfasstVonUserId,
    });
  });

  it('(F2) reicht KEIN kontextSnapshot durch (Listen-Pfad ist davon befreit)', () => {
    const dto = toEigenschutzVorfallListItemDto(baseRow);
    expect(dto).not.toHaveProperty('kontextSnapshot');
    expect(dto).not.toHaveProperty('einsatzId');
  });
});
