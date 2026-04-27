import { Result } from '@domain/common/result';
import { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import { ListGefaehrdungsbeurteilungenHandler } from '../list-gefaehrdungsbeurteilungen.handler';
import { ListGefaehrdungsbeurteilungenQuery } from '../list-gefaehrdungsbeurteilungen.query';

describe('ListGefaehrdungsbeurteilungenHandler', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const USER_ID = 'clw3h8x9y0000qwertyui00007';

  function buildReadModel() {
    const aggregate = Gefaehrdungsbeurteilung.create({
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      createdBy: USER_ID,
      items: [GefaehrdungItem.create({ title: 'Stolperfalle' }).value!],
    }).value!;
    return {
      aggregate,
      erstelltAm: new Date('2026-04-22T10:00:00.000Z'),
      aktualisiertAm: new Date('2026-04-22T10:15:00.000Z'),
      aktualisiertVonUserId: USER_ID,
    };
  }

  it('liefert alle Read-Models für den Einsatz', async () => {
    const readModel = buildReadModel();
    const repo = { findReadModelsByEinsatz: jest.fn().mockResolvedValue(Result.ok([readModel])) };

    const handler = new ListGefaehrdungsbeurteilungenHandler(repo as never);
    const result = await handler.execute(new ListGefaehrdungsbeurteilungenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([readModel]);
    expect(repo.findReadModelsByEinsatz).toHaveBeenCalledWith(EINSATZ_ID);
  });

  it('liefert eine leere Liste als gültigen Zustand', async () => {
    const repo = { findReadModelsByEinsatz: jest.fn().mockResolvedValue(Result.ok([])) };

    const handler = new ListGefaehrdungsbeurteilungenHandler(repo as never);
    const result = await handler.execute(new ListGefaehrdungsbeurteilungenQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('reicht Repository-Fehler durch', async () => {
    const repo = { findReadModelsByEinsatz: jest.fn().mockResolvedValue(Result.fail('DB unreachable')) };

    const handler = new ListGefaehrdungsbeurteilungenHandler(repo as never);
    const result = await handler.execute(new ListGefaehrdungsbeurteilungenQuery(EINSATZ_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('DB unreachable');
  });
});
