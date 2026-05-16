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
    status: 'OFFEN',
    geschlossenAm: null,
    geschlossenVonUserId: null,
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
      status: 'OFFEN',
      geschlossenAm: null,
      geschlossenVonUserId: null,
    });
  });

  it('(F2) reicht KEIN kontextSnapshot durch (Listen-Pfad ist davon befreit)', () => {
    const dto = toEigenschutzVorfallListItemDto(baseRow);
    expect(dto).not.toHaveProperty('kontextSnapshot');
    expect(dto).not.toHaveProperty('einsatzId');
  });

  it('(F3) Issue #415 — geschlossener Vorfall: status=GESCHLOSSEN + ISO-String', () => {
    const closedAt = new Date('2026-05-07T15:30:00.000Z');
    const dto = toEigenschutzVorfallListItemDto({
      ...baseRow,
      status: 'GESCHLOSSEN',
      geschlossenAm: closedAt,
      geschlossenVonUserId: 'clw3h8x9y0000qwertyui05099',
    });
    expect(dto.status).toBe('GESCHLOSSEN');
    expect(dto.geschlossenAm).toBe('2026-05-07T15:30:00.000Z');
    expect(dto.geschlossenVonUserId).toBe('clw3h8x9y0000qwertyui05099');
  });
});
