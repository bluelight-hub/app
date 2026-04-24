// @ts-nocheck
import { Result } from '@domain/common/result';
import { Gefaehrdungsbeurteilung } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungItem } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';
import { UserAggregate } from '@domain/aggregates/user.aggregate';
import { UserRole } from '@domain/value-objects/user-role';
import { Username } from '@domain/value-objects/username';
import { GET_GEFAEHRDUNGSBEURTEILUNG_HISTORIE_ERROR_CODES, GetGefaehrdungsbeurteilungHistorieHandler } from '../get-gefaehrdungsbeurteilung-historie.handler';
import { GetGefaehrdungsbeurteilungHistorieQuery } from '../get-gefaehrdungsbeurteilung-historie.query';

/**
 * Unit-Tests für `GetGefaehrdungsbeurteilungHistorieHandler` (Story 2.4 AC6).
 *
 * Abdeckung:
 *  1. Happy-Path (3 Versionen, 2 distinct User) — korrekte DESC-Sortierung +
 *     batched User-Namens-Resolution.
 *  2. Not-Found bei unbekannter ID.
 *  3. Cross-Einsatz-Leak-Check → NotFound statt 403.
 *  4. User-Repo liefert `null` (soft-deleted/gelockt) → `changedByUserName: null`,
 *     Historie trotzdem geliefert.
 *  5. User-Repo wirft Failure → defensiv `null`, Historie trotzdem geliefert.
 *  6. Versions-Repo liefert Fehler → Handler reicht durch.
 *  7. Versionen-Ordering: Handler gibt exakt die Reihenfolge weiter, die das
 *     Repo liefert (Repo garantiert DESC; Handler vertraut dem Repo-Vertrag).
 *  8. Invalide changedByUserId (UserId.create failt) → `null`-Name, kein Throw.
 */
describe('GetGefaehrdungsbeurteilungHistorieHandler', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const OTHER_EINSATZ_ID = 'clw3h8x9y0000qwertyui00099';
  const BEURTEILUNG_ID = 'clw3h8x9y0000qwertyui00003';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const USER_A_ID = 'clw3h8x9y0000qwertyui00007';
  const USER_B_ID = 'clw3h8x9y0000qwertyui00008';

  function buildAggregate(einsatzId: string = EINSATZ_ID, version = 3): Gefaehrdungsbeurteilung {
    const item = GefaehrdungItem.create({ title: 'Stolperfalle' }).value!;
    const result = Gefaehrdungsbeurteilung.reconstitute({
      id: BEURTEILUNG_ID,
      einsatzId,
      einheitId: EINHEIT_ID,
      createdBy: USER_A_ID,
      vorlageId: null,
      gefahrenzoneId: null,
      items: [item],
      version,
    });
    if (result.isFailure || !result.value) throw new Error(`Ungültige Test-Gefährdungsbeurteilung: ${result.error}`);
    return result.value;
  }

  function buildReadModel(einsatzId: string = EINSATZ_ID, aggregateVersion = 3) {
    return {
      aggregate: buildAggregate(einsatzId, aggregateVersion),
      erstelltAm: new Date('2026-04-22T09:00:00.000Z'),
      aktualisiertAm: new Date('2026-04-22T11:00:00.000Z'),
      aktualisiertVonUserId: USER_A_ID,
    };
  }

  function buildUser(username: string): UserAggregate {
    const usernameVo = Username.create(username).value!;
    const role = UserRole.USER();
    // Die tatsächliche ID des gebauten Aggregates ist für den Test egal — der
    // findById-Mock keyed auf die INPUT-UserId, nicht auf das zurückgegebene
    // Aggregate. Wir greifen im Assert nur auf `username.value` zu.
    return UserAggregate.create(usernameVo, role).value!;
  }

  function buildVersionRows() {
    const item = GefaehrdungItem.create({ title: 'Item' }).value!;
    return [
      {
        version: 3,
        items: [item],
        changedFields: { added: [], removed: ['r'], updated: [], unchanged: 1 },
        gueltigVon: new Date('2026-04-22T11:00:00.000Z'),
        gueltigBis: null,
        changedByUserId: USER_A_ID,
        eventId: 'evt-3',
      },
      {
        version: 2,
        items: [item],
        changedFields: { added: ['a'], removed: [], updated: [], unchanged: 0 },
        gueltigVon: new Date('2026-04-22T10:00:00.000Z'),
        gueltigBis: new Date('2026-04-22T11:00:00.000Z'),
        changedByUserId: USER_B_ID,
        eventId: 'evt-2',
      },
      {
        version: 1,
        items: [item],
        changedFields: { created: true },
        gueltigVon: new Date('2026-04-22T09:00:00.000Z'),
        gueltigBis: new Date('2026-04-22T10:00:00.000Z'),
        changedByUserId: USER_A_ID,
        eventId: 'evt-1',
      },
    ];
  }

  function buildHandler(overrides: { beurteilungRepo?: any; versionRepo?: any; userRepository?: any } = {}) {
    const beurteilungRepo = overrides.beurteilungRepo ?? {
      findReadModelById: jest.fn().mockResolvedValue(Result.ok(buildReadModel())),
    };
    const versionRepo = overrides.versionRepo ?? {
      findVersionsByBeurteilung: jest.fn().mockResolvedValue(Result.ok(buildVersionRows())),
    };
    const userRepository = overrides.userRepository ?? {
      findById: jest.fn().mockImplementation(async (userIdVo: any) => {
        const raw = userIdVo?.value;
        if (raw === USER_A_ID) return Result.ok(buildUser('alice'));
        if (raw === USER_B_ID) return Result.ok(buildUser('bob'));
        return Result.ok(null);
      }),
    };
    const handler = new GetGefaehrdungsbeurteilungHistorieHandler(beurteilungRepo, versionRepo, userRepository);
    return { handler, beurteilungRepo, versionRepo, userRepository };
  }

  it('(Happy-Path) liefert 3 DESC-sortierte Versionen mit aufgelösten Usernamen (2 distinct User, ein Promise.all-Batch)', async () => {
    const { handler, userRepository } = buildHandler();

    const result = await handler.execute(new GetGefaehrdungsbeurteilungHistorieQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isSuccess).toBe(true);
    const rm = result.value!;
    expect(rm.aggregateVersion).toBe(3);
    expect(rm.eintraege).toHaveLength(3);
    expect(rm.eintraege[0].version).toBe(3);
    expect(rm.eintraege[0].gueltigBis).toBeNull();
    expect(rm.eintraege[0].changedByUserName).toBe('alice');
    expect(rm.eintraege[1].version).toBe(2);
    expect(rm.eintraege[1].changedByUserName).toBe('bob');
    expect(rm.eintraege[2].version).toBe(1);
    expect(rm.eintraege[2].changedByUserName).toBe('alice');
    expect(rm.eintraege[2].changedFields).toEqual({ created: true });

    // Distinct-Batch: nur zwei User-Lookups für drei Rows (Anti-N+1).
    expect(userRepository.findById).toHaveBeenCalledTimes(2);
  });

  it('(Not-Found) liefert NOT_FOUND, wenn Read-Model fehlt', async () => {
    const { handler } = buildHandler({
      beurteilungRepo: { findReadModelById: jest.fn().mockResolvedValue(Result.ok(null)) },
    });

    const result = await handler.execute(new GetGefaehrdungsbeurteilungHistorieQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(GET_GEFAEHRDUNGSBEURTEILUNG_HISTORIE_ERROR_CODES.NOT_FOUND);
  });

  it('(Cross-Einsatz-Leak-Check) fremde einsatzId → NOT_FOUND (kein 403-Leak)', async () => {
    const { handler, versionRepo, userRepository } = buildHandler({
      beurteilungRepo: {
        // Read-Model sagt: Beurteilung gehört zu einem anderen Einsatz.
        findReadModelById: jest.fn().mockResolvedValue(Result.ok(buildReadModel(OTHER_EINSATZ_ID))),
      },
    });

    const result = await handler.execute(new GetGefaehrdungsbeurteilungHistorieQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(GET_GEFAEHRDUNGSBEURTEILUNG_HISTORIE_ERROR_CODES.NOT_FOUND);
    // Versions-/User-Repo werden beim Cross-Einsatz-Mismatch NICHT mehr konsumiert.
    expect(versionRepo.findVersionsByBeurteilung).not.toHaveBeenCalled();
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('(User-Repo liefert null) Historie wird trotzdem geliefert, `changedByUserName: null`', async () => {
    const { handler } = buildHandler({
      userRepository: {
        findById: jest.fn().mockResolvedValue(Result.ok(null)),
      },
    });

    const result = await handler.execute(new GetGefaehrdungsbeurteilungHistorieQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isSuccess).toBe(true);
    const rm = result.value!;
    expect(rm.eintraege).toHaveLength(3);
    for (const e of rm.eintraege) {
      expect(e.changedByUserName).toBeNull();
    }
  });

  it('(User-Repo Failure) defensiv `null`-Name, Historie wird geliefert', async () => {
    const { handler } = buildHandler({
      userRepository: {
        findById: jest.fn().mockResolvedValue(Result.fail('DB outage')),
      },
    });

    const result = await handler.execute(new GetGefaehrdungsbeurteilungHistorieQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isSuccess).toBe(true);
    const rm = result.value!;
    expect(rm.eintraege).toHaveLength(3);
    for (const e of rm.eintraege) {
      expect(e.changedByUserName).toBeNull();
    }
  });

  it('(Versions-Repo Failure) reicht den Fehler durch', async () => {
    const { handler } = buildHandler({
      versionRepo: { findVersionsByBeurteilung: jest.fn().mockResolvedValue(Result.fail('InfrastructureError:LoadVersions')) },
    });

    const result = await handler.execute(new GetGefaehrdungsbeurteilungHistorieQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:LoadVersions');
  });

  it('(Version-Ordering) Handler respektiert die Repo-Reihenfolge 1:1 (DESC-Vertrag im Repo)', async () => {
    // Defensive: Test verifiziert, dass der Handler NICHT umsortiert.
    const reversedRows = buildVersionRows().reverse(); // ASC-Order statt DESC
    const { handler } = buildHandler({
      versionRepo: { findVersionsByBeurteilung: jest.fn().mockResolvedValue(Result.ok(reversedRows)) },
    });

    const result = await handler.execute(new GetGefaehrdungsbeurteilungHistorieQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isSuccess).toBe(true);
    const rm = result.value!;
    // Handler hat nicht resortiert — Vertrauen in den Repo-Vertrag.
    expect(rm.eintraege.map((e) => e.version)).toEqual([1, 2, 3]);
  });

  it('(Invalide UserId) fängt UserId.create-Failure defensiv ab, setzt `null`-Name, liefert Historie', async () => {
    const badRows = [
      {
        version: 1,
        items: [],
        changedFields: { created: true },
        gueltigVon: new Date('2026-04-22T09:00:00.000Z'),
        gueltigBis: null,
        changedByUserId: 'NOT-A-VALID-CUID', // UserId.create schlägt fehl.
        eventId: 'evt-1',
      },
    ];
    const findById = jest.fn();
    const { handler } = buildHandler({
      versionRepo: { findVersionsByBeurteilung: jest.fn().mockResolvedValue(Result.ok(badRows)) },
      userRepository: { findById },
    });

    const result = await handler.execute(new GetGefaehrdungsbeurteilungHistorieQuery(EINSATZ_ID, BEURTEILUNG_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value!.eintraege).toHaveLength(1);
    expect(result.value!.eintraege[0].changedByUserName).toBeNull();
    // findById wird bei invalider Id gar nicht erst aufgerufen.
    expect(findById).not.toHaveBeenCalled();
  });
});
