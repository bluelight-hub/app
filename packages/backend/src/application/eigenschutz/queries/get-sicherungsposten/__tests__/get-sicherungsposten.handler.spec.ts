import { Result } from '@domain/common/result';
import { Sicherungsposten } from '@domain/eigenschutz/aggregates/sicherungsposten.aggregate';
import type { ISicherungspostenRepository, SicherungspostenReadModel } from '@domain/eigenschutz/repositories';
import { Standort } from '@domain/eigenschutz/value-objects/standort.vo';
import { GET_SICHERUNGSPOSTEN_ERROR_CODES, GetSicherungspostenHandler } from '../get-sicherungsposten.handler';
import { GetSicherungspostenQuery } from '../get-sicherungsposten.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui04001';
const OTHER_EINSATZ_ID = 'clw3h8x9y0000qwertyui09999';
const POSTEN_ID = 'clw3h8x9y0000qwertyui04077';
const USER_ID = 'clw3h8x9y0000qwertyui04003';

function buildReadModel(einsatzId: string): SicherungspostenReadModel {
  const standort = Standort.create({ kind: 'address', text: 'Hauptbahnhof' }).value!;
  const aggregate = Sicherungsposten.create({
    einsatzId,
    bezeichnung: 'Posten Nord',
    standort,
    personal: [],
    createdBy: USER_ID,
  }).value!;
  return {
    aggregate,
    erstelltAm: new Date('2026-05-05T10:00:00Z'),
    aktualisiertAm: new Date('2026-05-05T10:05:00Z'),
    aktualisiertVonUserId: USER_ID,
  };
}

function buildHandler(repoOverrides: Partial<ISicherungspostenRepository> = {}) {
  const repo: ISicherungspostenRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findReadModelById: jest.fn().mockResolvedValue(Result.ok(null)),
    findActiveByEinsatzId: jest.fn(),
    findResolvedByEinsatzId: jest.fn(),
    existsInEinsatz: jest.fn(),
    ...repoOverrides,
  };
  return { handler: new GetSicherungspostenHandler(repo), repo };
}

describe('GetSicherungspostenHandler (Story 4.4)', () => {
  it('(1) Erfolgreich: ReadModel im selben Einsatz wird zurückgeliefert', async () => {
    const readModel = buildReadModel(EINSATZ_ID);
    const findReadModelById = jest.fn().mockResolvedValue(Result.ok(readModel));
    const { handler } = buildHandler({ findReadModelById });

    const result = await handler.execute(new GetSicherungspostenQuery(EINSATZ_ID, POSTEN_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(readModel);
    expect(findReadModelById).toHaveBeenCalledWith(POSTEN_ID);
  });

  it('(2) Cross-Einsatz: ReadModel mit anderer einsatzId → NotFound (kein Existenz-Leak)', async () => {
    const readModel = buildReadModel(OTHER_EINSATZ_ID);
    const findReadModelById = jest.fn().mockResolvedValue(Result.ok(readModel));
    const { handler } = buildHandler({ findReadModelById });

    const result = await handler.execute(new GetSicherungspostenQuery(EINSATZ_ID, POSTEN_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(GET_SICHERUNGSPOSTEN_ERROR_CODES.NOT_FOUND);
  });

  it('(3) Unbekannte ID: Repository liefert Result.ok(null) → NotFound', async () => {
    const findReadModelById = jest.fn().mockResolvedValue(Result.ok(null));
    const { handler } = buildHandler({ findReadModelById });

    const result = await handler.execute(new GetSicherungspostenQuery(EINSATZ_ID, POSTEN_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(GET_SICHERUNGSPOSTEN_ERROR_CODES.NOT_FOUND);
  });

  it('(4) Repository-Failure wird durchgereicht', async () => {
    const findReadModelById = jest.fn().mockResolvedValue(Result.fail<SicherungspostenReadModel | null>('InfrastructureError:Eigenschutz:db-down'));
    const { handler } = buildHandler({ findReadModelById });

    const result = await handler.execute(new GetSicherungspostenQuery(EINSATZ_ID, POSTEN_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:Eigenschutz:db-down');
  });
});
