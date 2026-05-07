import { Result } from '@domain/common/result';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import type { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import { GetVorfallByIdQuery } from '../get-vorfall-by-id.query';
import { GET_VORFALL_BY_ID_ERROR_CODES, GetVorfallByIdHandler } from '../get-vorfall-by-id.handler';

const EINSATZ_ID = 'cl9einsatz12345678901234';
const VORFALL_ID = 'cl9vorfall12345678901234x';

function makeRepo(overrides: Partial<IEigenschutzVorfallRepository> = {}): IEigenschutzVorfallRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(Result.ok(null)),
    existsInEinsatz: jest.fn(),
    ...overrides,
  } as IEigenschutzVorfallRepository;
}

describe('GetVorfallByIdHandler (Story 5.2 AC10)', () => {
  it('liefert Result.ok mit Vorfall, wenn einsatzId matcht', async () => {
    const fakeVorfall = { einsatzId: EINSATZ_ID } as EigenschutzVorfall;
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(Result.ok(fakeVorfall)) });
    const handler = new GetVorfallByIdHandler(repo);

    const result = await handler.execute(new GetVorfallByIdQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(fakeVorfall);
  });

  it('liefert NotFound-Sentinel, wenn Vorfall nicht existiert', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(Result.ok(null)) });
    const handler = new GetVorfallByIdHandler(repo);

    const result = await handler.execute(new GetVorfallByIdQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(GET_VORFALL_BY_ID_ERROR_CODES.NOT_FOUND);
  });

  it('liefert NotFound-Sentinel bei Cross-Einsatz (kein Existenz-Leak)', async () => {
    const fakeVorfall = { einsatzId: 'cl9einsatzfremd1234567890' } as EigenschutzVorfall;
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(Result.ok(fakeVorfall)) });
    const handler = new GetVorfallByIdHandler(repo);

    const result = await handler.execute(new GetVorfallByIdQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(GET_VORFALL_BY_ID_ERROR_CODES.NOT_FOUND);
  });

  it('reicht Reconstitute-Failure als InfrastructureError-Sentinel weiter', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(Result.fail('InfrastructureError:ReconstituteEigenschutzVorfall:KontextSnapshotCorrupt:NotAnObject')) });
    const handler = new GetVorfallByIdHandler(repo);

    const result = await handler.execute(new GetVorfallByIdQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:ReconstituteEigenschutzVorfall:/);
  });
});
