import { Result } from '@domain/common/result';
import type { ISicherungspostenRepository, SicherungspostenReadModel } from '@domain/eigenschutz/repositories';
import { ListSicherungspostenQuery } from '../list-sicherungsposten.query';
import { ListSicherungspostenHandler } from '../list-sicherungsposten.handler';

function buildHandler(repoOverrides: Partial<ISicherungspostenRepository> = {}) {
  const repo: ISicherungspostenRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findReadModelById: jest.fn(),
    findActiveByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
    findResolvedByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
    existsInEinsatz: jest.fn(),
    ...repoOverrides,
  };
  return { handler: new ListSicherungspostenHandler(repo), repo };
}

describe('ListSicherungspostenHandler (Story 4.1)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui04001';

  it('(1) status=AKTIV → ruft findActiveByEinsatzId auf', async () => {
    const findActive = jest.fn().mockResolvedValue(Result.ok([] as SicherungspostenReadModel[]));
    const findResolved = jest.fn().mockResolvedValue(Result.ok([] as SicherungspostenReadModel[]));
    const { handler } = buildHandler({ findActiveByEinsatzId: findActive, findResolvedByEinsatzId: findResolved });
    const result = await handler.execute(new ListSicherungspostenQuery(EINSATZ_ID, 'AKTIV'));
    expect(result.isSuccess).toBe(true);
    expect(findActive).toHaveBeenCalledWith(EINSATZ_ID);
    expect(findResolved).not.toHaveBeenCalled();
  });

  it('(2) status=AUFGELOEST → ruft findResolvedByEinsatzId auf', async () => {
    const findActive = jest.fn();
    const findResolved = jest.fn().mockResolvedValue(Result.ok([] as SicherungspostenReadModel[]));
    const { handler } = buildHandler({ findActiveByEinsatzId: findActive, findResolvedByEinsatzId: findResolved });
    await handler.execute(new ListSicherungspostenQuery(EINSATZ_ID, 'AUFGELOEST'));
    expect(findResolved).toHaveBeenCalledWith(EINSATZ_ID);
    expect(findActive).not.toHaveBeenCalled();
  });

  it('(3) Repo-Failure wird durchgereicht', async () => {
    const { handler } = buildHandler({ findActiveByEinsatzId: jest.fn().mockResolvedValue(Result.fail<SicherungspostenReadModel[]>('DB down')) });
    const result = await handler.execute(new ListSicherungspostenQuery(EINSATZ_ID, 'AKTIV'));
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('DB down');
  });

  it('(4) Erfolgs-Fall liefert ReadModel-Array durch', async () => {
    const fakeReadModel = { aggregate: { id: { value: 'x' } }, erstelltAm: new Date(), aktualisiertAm: new Date(), aktualisiertVonUserId: 'u' } as unknown as SicherungspostenReadModel;
    const { handler } = buildHandler({ findActiveByEinsatzId: jest.fn().mockResolvedValue(Result.ok([fakeReadModel])) });
    const result = await handler.execute(new ListSicherungspostenQuery(EINSATZ_ID, 'AKTIV'));
    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(1);
  });
});
