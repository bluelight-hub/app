// @ts-nocheck
import { BadRequestException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { RufnameVorschlaegeController } from '../rufname-vorschlaege.controller';

describe('RufnameVorschlaegeController', () => {
  let controller: RufnameVorschlaegeController;
  let handler: any;

  beforeEach(() => {
    handler = { execute: jest.fn() };
    controller = new RufnameVorschlaegeController(handler);
  });

  it('liefert Fahrzeuge, Personen und Einheiten', async () => {
    handler.execute.mockResolvedValue(
      Result.ok({
        fahrzeuge: [{ id: 'fz-1', funkrufname: 'Florian 12-1' }],
        personen: [{ id: 'p-1', funkrufname: 'Mustermann, Max' }],
        einheiten: [{ id: 'e-1', name: 'Abschnitt Nord' }],
      }),
    );
    const result = await controller.list('einsatz-1');
    expect(result.fahrzeuge).toHaveLength(1);
    expect(result.personen[0].funkrufname).toBe('Mustermann, Max');
    expect(result.einheiten[0].name).toBe('Abschnitt Nord');
  });

  it('liefert leere Listen bei leerem Einsatz', async () => {
    handler.execute.mockResolvedValue(Result.ok({ fahrzeuge: [], personen: [], einheiten: [] }));
    const result = await controller.list('einsatz-1');
    expect(result.fahrzeuge).toEqual([]);
    expect(result.personen).toEqual([]);
    expect(result.einheiten).toEqual([]);
  });

  it('propagiert 400 bei Query-Fehler', async () => {
    handler.execute.mockResolvedValue(Result.fail('Fahrzeuge konnten nicht geladen werden'));
    await expect(controller.list('einsatz-1')).rejects.toThrow(BadRequestException);
  });
});
