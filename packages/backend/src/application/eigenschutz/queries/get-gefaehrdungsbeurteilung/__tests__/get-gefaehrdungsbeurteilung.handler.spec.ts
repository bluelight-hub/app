// @ts-nocheck
import { Result } from '@domain/common/result';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GET_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES, GetGefaehrdungsbeurteilungHandler } from '../get-gefaehrdungsbeurteilung.handler';
import { GetGefaehrdungsbeurteilungQuery } from '../get-gefaehrdungsbeurteilung.query';

/**
 * Unit-Tests für `GetGefaehrdungsbeurteilungHandler`.
 *
 * Drei Pfade:
 *  1. Happy-Path — Read-Model für passenden Einsatz liefert `Result.ok(...)`.
 *  2. Fremder Einsatz — Read-Model existiert, aber `einsatzId` passt nicht →
 *     `NotFound:Beurteilung` (AC6-symmetrischer Cross-Einsatz-Check).
 *  3. Unbekannte ID — Repository liefert `null` → `NotFound:Beurteilung`.
 *  4. Repo-Fehler wird durchgereicht (Fail-Fast für Infra-Ausfälle).
 */
describe('GetGefaehrdungsbeurteilungHandler', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const OTHER_EINSATZ_ID = 'clw3h8x9y0000qwertyui00099';
  const BEURTEILUNG_ID = 'clw3h8x9y0000qwertyui00003';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const USER_ID = 'clw3h8x9y0000qwertyui00007';

  function buildAggregate(einsatzId: string): Gefaehrdungsbeurteilung {
    const item = GefaehrdungItem.create({ title: 'Stolperfalle' }).value!;
    const res = Gefaehrdungsbeurteilung.create({
      id: BEURTEILUNG_ID,
      einsatzId,
      einheitId: EINHEIT_ID,
      createdBy: USER_ID,
      vorlageId: null,
      gefahrenzoneId: null,
      items: [item],
    });
    return res.value!;
  }

  it('liefert das Read-Model, wenn die Beurteilung existiert und zum angegebenen Einsatz gehört', async () => {
    const readModel = {
      aggregate: buildAggregate(EINSATZ_ID),
      erstelltAm: new Date('2026-04-22T10:00:00.000Z'),
      aktualisiertAm: new Date('2026-04-22T10:15:00.000Z'),
      aktualisiertVonUserId: USER_ID,
    };
    const repo = { findReadModelById: jest.fn().mockResolvedValue(Result.ok(readModel)) };

    const handler = new GetGefaehrdungsbeurteilungHandler(repo as any);
    const result = await handler.execute(new GetGefaehrdungsbeurteilungQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(readModel);
    expect(repo.findReadModelById).toHaveBeenCalledWith(BEURTEILUNG_ID);
  });

  it('liefert NOT_FOUND, wenn die Beurteilung zu einem anderen Einsatz gehört (Cross-Einsatz-Check)', async () => {
    const readModel = {
      aggregate: buildAggregate(OTHER_EINSATZ_ID),
      erstelltAm: new Date(),
      aktualisiertAm: new Date(),
      aktualisiertVonUserId: USER_ID,
    };
    const repo = { findReadModelById: jest.fn().mockResolvedValue(Result.ok(readModel)) };

    const handler = new GetGefaehrdungsbeurteilungHandler(repo as any);
    const result = await handler.execute(new GetGefaehrdungsbeurteilungQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(GET_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.NOT_FOUND);
  });

  it('liefert NOT_FOUND, wenn keine Zeile existiert', async () => {
    const repo = { findReadModelById: jest.fn().mockResolvedValue(Result.ok(null)) };

    const handler = new GetGefaehrdungsbeurteilungHandler(repo as any);
    const result = await handler.execute(new GetGefaehrdungsbeurteilungQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(GET_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES.NOT_FOUND);
  });

  it('reicht Repository-Fehler durch', async () => {
    const repo = { findReadModelById: jest.fn().mockResolvedValue(Result.fail('DB unreachable')) };

    const handler = new GetGefaehrdungsbeurteilungHandler(repo as any);
    const result = await handler.execute(new GetGefaehrdungsbeurteilungQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('DB unreachable');
  });
});
