import { Result } from '@domain/common/result';
import type { IEigenschutzVorfallRepository, VorfallListFilter, VorfallListReadRow } from '@domain/eigenschutz/repositories';
import { LIST_VORFAELLE_ERROR_CODES } from '../list-vorfaelle.error-codes';
import { ListVorfaelleHandler } from '../list-vorfaelle.handler';
import { ListVorfaelleQuery } from '../list-vorfaelle.query';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
const USER_ID = 'clw3h8x9y0000qwertyui05003';

function makeRepoMock(overrides?: Partial<IEigenschutzVorfallRepository>): IEigenschutzVorfallRepository & {
  findByEinsatzWithFilters: jest.Mock;
} {
  const findByEinsatzWithFilters = jest.fn().mockResolvedValue(Result.ok<VorfallListReadRow[]>([]));
  return {
    save: jest.fn(),
    findById: jest.fn(),
    existsInEinsatz: jest.fn(),
    findByEinsatzWithFilters,
    ...overrides,
  } as IEigenschutzVorfallRepository & { findByEinsatzWithFilters: jest.Mock };
}

function row(overrides: Partial<VorfallListReadRow> = {}): VorfallListReadRow {
  return {
    id: overrides.id ?? 'clw3h8x9y0000qwertyui05101',
    einsatzId: EINSATZ_ID,
    einheitId: overrides.einheitId ?? 'clw3h8x9y0000qwertyui05002',
    vorfallZeit: overrides.vorfallZeit ?? new Date('2026-05-06T10:00:00.000Z'),
    was: overrides.was ?? 'Sturz beim Aufbau',
    unfallkasseRelevant: overrides.unfallkasseRelevant ?? true,
    erfasstAm: overrides.erfasstAm ?? new Date('2026-05-06T10:01:00.000Z'),
    erfasstVonUserId: overrides.erfasstVonUserId ?? USER_ID,
    status: overrides.status ?? 'OFFEN',
    geschlossenAm: overrides.geschlossenAm === undefined ? null : overrides.geschlossenAm,
    geschlossenVonUserId: overrides.geschlossenVonUserId === undefined ? null : overrides.geschlossenVonUserId,
  };
}

describe('ListVorfaelleHandler (Story 5.3 AC2)', () => {
  it('(H1) leerer einsatzId → ValidationFailed:VorfallListFilter:EinsatzRequired', async () => {
    const repo = makeRepoMock();
    const handler = new ListVorfaelleHandler(repo);

    const result = await handler.execute(new ListVorfaelleQuery('  ', {}, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(LIST_VORFAELLE_ERROR_CODES.EINSATZ_REQUIRED);
    expect(repo.findByEinsatzWithFilters).not.toHaveBeenCalled();
  });

  it('(H2) einheitIds > 50 → ValidationFailed:VorfallListFilter:EinheitIdsCap', async () => {
    const repo = makeRepoMock();
    const handler = new ListVorfaelleHandler(repo);
    const ids = Array.from({ length: 51 }, (_, i) => `clw3h8x9y0000qwertyui0500${i}`);

    const result = await handler.execute(new ListVorfaelleQuery(EINSATZ_ID, { einheitIds: ids }, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(LIST_VORFAELLE_ERROR_CODES.EINHEIT_IDS_CAP);
    expect(repo.findByEinsatzWithFilters).not.toHaveBeenCalled();
  });

  it('(H3) vorfallZeitVon > vorfallZeitBis → ValidationFailed:VorfallListFilter:RangeInvalid', async () => {
    const repo = makeRepoMock();
    const handler = new ListVorfaelleHandler(repo);
    const filter: VorfallListFilter = {
      vorfallZeitVon: new Date('2026-05-08T00:00:00.000Z'),
      vorfallZeitBis: new Date('2026-05-01T00:00:00.000Z'),
    };

    const result = await handler.execute(new ListVorfaelleQuery(EINSATZ_ID, filter, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(LIST_VORFAELLE_ERROR_CODES.RANGE_INVALID);
    expect(repo.findByEinsatzWithFilters).not.toHaveBeenCalled();
  });

  it('(H4) Repo-Failure ohne Sentinel-Präfix → InfrastructureError-wrap', async () => {
    const repo = makeRepoMock({
      findByEinsatzWithFilters: jest.fn().mockResolvedValue(Result.fail<VorfallListReadRow[]>('DB-Connection-Loss')),
    });
    const handler = new ListVorfaelleHandler(repo);

    const result = await handler.execute(new ListVorfaelleQuery(EINSATZ_ID, {}, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:ListEigenschutzVorfaelle:DB-Connection-Loss$/);
  });

  it('(H4b) Repo-Failure MIT Sentinel-Präfix → Pass-Through', async () => {
    const repo = makeRepoMock({
      findByEinsatzWithFilters: jest.fn().mockResolvedValue(Result.fail<VorfallListReadRow[]>('InfrastructureError:ListEigenschutzVorfaelle:Timeout')),
    });
    const handler = new ListVorfaelleHandler(repo);

    const result = await handler.execute(new ListVorfaelleQuery(EINSATZ_ID, {}, USER_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:ListEigenschutzVorfaelle:Timeout');
  });

  it('(H5) Happy-Path: liefert Repo-Rows 1:1, ruft Repo mit getrimmtem einsatzId + Filter auf', async () => {
    const rows = [row({ id: 'a' }), row({ id: 'b' })];
    const findByEinsatzWithFilters = jest.fn().mockResolvedValue(Result.ok<VorfallListReadRow[]>(rows));
    const repo = makeRepoMock({ findByEinsatzWithFilters });
    const handler = new ListVorfaelleHandler(repo);
    const filter: VorfallListFilter = { unfallkasseRelevant: true };

    const result = await handler.execute(new ListVorfaelleQuery(`  ${EINSATZ_ID}  `, filter, USER_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(rows);
    expect(findByEinsatzWithFilters).toHaveBeenCalledWith(EINSATZ_ID, filter);
  });
});
