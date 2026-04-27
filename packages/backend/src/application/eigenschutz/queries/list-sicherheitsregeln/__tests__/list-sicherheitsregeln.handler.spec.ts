import { Result } from '@domain/common/result';
import { Sicherheitsregel } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import { ListSicherheitsregelnHandler } from '../list-sicherheitsregeln.handler';
import { ListSicherheitsregelnQuery } from '../list-sicherheitsregeln.query';

describe('ListSicherheitsregelnHandler', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const USER_ID = 'clw3h8x9y0000qwertyui00099';
  const PROPAGATION_GROUP_ID = 'grp3h8x9y0000qwertyui00111';

  /**
   * Story 2.6 Code-Review-Patch: Handler injiziert jetzt zusätzlich
   * `IEinsatzEinheitRepository`, um Cross-Einsatz-Filter-Drift bei
   * `?einheitId=<id>` mit ID einer fremden Einheit zu verhindern.
   */
  function einheitRepoFor(einsatzId: string | null) {
    return {
      findById: jest.fn().mockResolvedValue(einsatzId === null ? Result.ok(null) : Result.ok({ id: EINHEIT_ID, einsatzId })),
    } as never;
  }

  function buildReadModel(einheitId: string | null) {
    const aggregate = Sicherheitsregel.create({
      einsatzId: EINSATZ_ID,
      einheitId,
      titel: 'Regel-Titel',
      inhalt: 'Regel-Inhalt',
      erstelltVonUserId: USER_ID,
      propagationGroupId: PROPAGATION_GROUP_ID,
    }).value!;
    return {
      aggregate,
      erstelltAm: new Date('2026-04-22T10:00:00.000Z'),
      aktualisiertAm: new Date('2026-04-22T10:15:00.000Z'),
      aktualisiertVonUserId: USER_ID,
      propagationGroupId: PROPAGATION_GROUP_ID,
    };
  }

  it('liefert alle aktiven Read-Models für den Einsatz (Default ohne Filter)', async () => {
    const readModels = [buildReadModel(null), buildReadModel(EINHEIT_ID)];
    const repo = { findActiveByEinsatz: jest.fn().mockResolvedValue(Result.ok(readModels)) };

    const handler = new ListSicherheitsregelnHandler(repo as never, einheitRepoFor(EINSATZ_ID));
    const result = await handler.execute(new ListSicherheitsregelnQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(readModels);
    expect(repo.findActiveByEinsatz).toHaveBeenCalledWith(EINSATZ_ID, undefined);
  });

  it('filtert auf einsatzweit-only bei einheitId=null', async () => {
    const readModels = [buildReadModel(null)];
    const repo = { findActiveByEinsatz: jest.fn().mockResolvedValue(Result.ok(readModels)) };

    const handler = new ListSicherheitsregelnHandler(repo as never, einheitRepoFor(EINSATZ_ID));
    const result = await handler.execute(new ListSicherheitsregelnQuery(EINSATZ_ID, null));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(readModels);
    expect(repo.findActiveByEinsatz).toHaveBeenCalledWith(EINSATZ_ID, null);
  });

  it('filtert auf einheitId + einsatzweit (Abschnittsleiter-Sicht)', async () => {
    const readModels = [buildReadModel(null), buildReadModel(EINHEIT_ID)];
    const repo = { findActiveByEinsatz: jest.fn().mockResolvedValue(Result.ok(readModels)) };

    const handler = new ListSicherheitsregelnHandler(repo as never, einheitRepoFor(EINSATZ_ID));
    const result = await handler.execute(new ListSicherheitsregelnQuery(EINSATZ_ID, EINHEIT_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual(readModels);
    expect(repo.findActiveByEinsatz).toHaveBeenCalledWith(EINSATZ_ID, EINHEIT_ID);
  });

  it('liefert eine leere Liste als gültigen Zustand', async () => {
    const repo = { findActiveByEinsatz: jest.fn().mockResolvedValue(Result.ok([])) };

    const handler = new ListSicherheitsregelnHandler(repo as never, einheitRepoFor(EINSATZ_ID));
    const result = await handler.execute(new ListSicherheitsregelnQuery(EINSATZ_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('reicht Repository-Fehler durch', async () => {
    const repo = { findActiveByEinsatz: jest.fn().mockResolvedValue(Result.fail('DB unreachable')) };

    const handler = new ListSicherheitsregelnHandler(repo as never, einheitRepoFor(EINSATZ_ID));
    const result = await handler.execute(new ListSicherheitsregelnQuery(EINSATZ_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('DB unreachable');
  });

  it('lehnt einheitId aus fremdem Einsatz mit NotFound:Einheit ab', async () => {
    const repo = { findActiveByEinsatz: jest.fn() };

    const handler = new ListSicherheitsregelnHandler(repo as never, einheitRepoFor('anderer-einsatz'));
    const result = await handler.execute(new ListSicherheitsregelnQuery(EINSATZ_ID, EINHEIT_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Einheit');
    expect(repo.findActiveByEinsatz).not.toHaveBeenCalled();
  });

  it('lehnt unbekannte einheitId mit NotFound:Einheit ab', async () => {
    const repo = { findActiveByEinsatz: jest.fn() };

    const handler = new ListSicherheitsregelnHandler(repo as never, einheitRepoFor(null));
    const result = await handler.execute(new ListSicherheitsregelnQuery(EINSATZ_ID, EINHEIT_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Einheit');
    expect(repo.findActiveByEinsatz).not.toHaveBeenCalled();
  });
});
