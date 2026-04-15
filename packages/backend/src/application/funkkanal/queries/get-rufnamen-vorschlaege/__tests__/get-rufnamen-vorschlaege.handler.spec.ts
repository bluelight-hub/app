// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { GetRufnamenVorschlaegeQueryHandler } from '../get-rufnamen-vorschlaege.handler';
import { GetRufnamenVorschlaegeQuery } from '../get-rufnamen-vorschlaege.query';
import { Result } from '@domain/common/result';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';

describe('GetRufnamenVorschlaegeQueryHandler', () => {
  let handler: GetRufnamenVorschlaegeQueryHandler;
  let mockFahrzeugRepo: { findByEinsatzId: jest.Mock };
  let mockPersonRepo: { findByEinsatzId: jest.Mock };
  let mockEinheitRepo: { findByEinsatzId: jest.Mock };

  beforeEach(async () => {
    mockFahrzeugRepo = { findByEinsatzId: jest.fn() };
    mockPersonRepo = { findByEinsatzId: jest.fn() };
    mockEinheitRepo = { findByEinsatzId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRufnamenVorschlaegeQueryHandler,
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockFahrzeugRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockPersonRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: mockEinheitRepo },
      ],
    }).compile();

    handler = module.get(GetRufnamenVorschlaegeQueryHandler);
  });

  it('liefert Rufnamen aller drei Kraft-Arten', async () => {
    mockFahrzeugRepo.findByEinsatzId.mockResolvedValue(Result.ok([{ id: { value: 'f1' }, funkrufname: 'Florian 1' }]));
    mockPersonRepo.findByEinsatzId.mockResolvedValue(
      Result.ok([
        { id: { value: 'p1' }, funkrufname: 'Leiter', vorname: 'Anna', nachname: 'Admin' },
        { id: { value: 'p2' }, funkrufname: undefined, vorname: 'Max', nachname: 'Mustermann' },
      ]),
    );
    mockEinheitRepo.findByEinsatzId.mockResolvedValue(Result.ok([{ id: { value: 'e1' }, name: 'ZTrupp' }]));

    const query = GetRufnamenVorschlaegeQuery.create({ einsatzId: 'abc' }).value!;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.fahrzeuge).toEqual([{ id: 'f1', funkrufname: 'Florian 1' }]);
    expect(result.value!.personen).toEqual([
      { id: 'p1', funkrufname: 'Leiter' },
      { id: 'p2', funkrufname: 'Max Mustermann' },
    ]);
    expect(result.value!.einheiten).toEqual([{ id: 'e1', name: 'ZTrupp' }]);
  });

  it('filtert Personen ohne Namen heraus', async () => {
    mockFahrzeugRepo.findByEinsatzId.mockResolvedValue(Result.ok([]));
    mockPersonRepo.findByEinsatzId.mockResolvedValue(Result.ok([{ id: { value: 'p1' }, funkrufname: '  ', vorname: '', nachname: '' }]));
    mockEinheitRepo.findByEinsatzId.mockResolvedValue(Result.ok([]));

    const query = GetRufnamenVorschlaegeQuery.create({ einsatzId: 'abc' }).value!;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.personen).toEqual([]);
  });

  it('propagiert Fehler aus einem Repository', async () => {
    mockFahrzeugRepo.findByEinsatzId.mockResolvedValue(Result.fail('db down'));
    mockPersonRepo.findByEinsatzId.mockResolvedValue(Result.ok([]));
    mockEinheitRepo.findByEinsatzId.mockResolvedValue(Result.ok([]));

    const query = GetRufnamenVorschlaegeQuery.create({ einsatzId: 'abc' }).value!;
    const result = await handler.execute(query);
    expect(result.isFailure).toBe(true);
  });
});
