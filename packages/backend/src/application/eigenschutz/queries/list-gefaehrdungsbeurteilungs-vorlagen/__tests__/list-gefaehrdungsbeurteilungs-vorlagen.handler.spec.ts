// @ts-nocheck
import { Result } from '@domain/common/result';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import { ListGefaehrdungsbeurteilungsVorlagenHandler } from '../list-gefaehrdungsbeurteilungs-vorlagen.handler';
import { ListGefaehrdungsbeurteilungsVorlagenQuery } from '../list-gefaehrdungsbeurteilungs-vorlagen.query';

describe('ListGefaehrdungsbeurteilungsVorlagenHandler', () => {
  it('delegiert an findAktive() und reicht das Ergebnis 1:1 durch', async () => {
    const vorlage = {
      id: 'clw3h8x9y0000qwertyui00001',
      slug: 'manv',
      name: 'MANV',
      szenario: 'MANV',
      items: [GefaehrdungItem.create({ title: 'Stolperfalle' }).value!],
      version: 1,
      aktiv: true,
      erstelltAm: new Date(),
    };
    const vorlageRepo = { findAktive: jest.fn().mockResolvedValue(Result.ok([vorlage])), findById: jest.fn() };
    const handler = new ListGefaehrdungsbeurteilungsVorlagenHandler(vorlageRepo as any);

    const result = await handler.execute(new ListGefaehrdungsbeurteilungsVorlagenQuery('clw3h8x9y0000qwertyui00002'));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([vorlage]);
    expect(vorlageRepo.findAktive).toHaveBeenCalledTimes(1);
  });

  it('reicht Fehler aus dem Repository durch', async () => {
    const vorlageRepo = { findAktive: jest.fn().mockResolvedValue(Result.fail('boom')), findById: jest.fn() };
    const handler = new ListGefaehrdungsbeurteilungsVorlagenHandler(vorlageRepo as any);

    const result = await handler.execute(new ListGefaehrdungsbeurteilungsVorlagenQuery('einsatz-1'));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('boom');
  });
});
