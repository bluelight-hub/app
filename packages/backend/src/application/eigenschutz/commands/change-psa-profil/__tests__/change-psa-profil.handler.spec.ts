/**
 * Unit-Tests für `ChangePsaProfilHandler` (Story 3.1 + Story 3.2 Bulk).
 *
 * Mock-basiert: PrismaService → Stub-Transaction-Runner; Repositories →
 * In-Memory-Mocks. Wir prüfen die Branch-Logik, nicht die echte Postgres-
 * Concurrency (Action-Item B3 / Story 3.9 Harness).
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { EinsatzTeilnehmerDto, IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { IPsaProfilZuweisungRepository } from '@domain/eigenschutz/repositories/i-psa-profil-zuweisung.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { PsaProfilZuweisung } from '@domain/eigenschutz/aggregates/psa-profil-zuweisung.aggregate';
import { Result } from '@domain/common/result';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { ChangePsaProfilCommand } from '../change-psa-profil.command';
import { ChangePsaProfilHandler, CHANGE_PSA_PROFIL_ERROR_CODES } from '../change-psa-profil.handler';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

const NOOP_LOGGER: ILogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

function buildPrismaStub(): PrismaService {
  return {
    $transaction: jest.fn().mockImplementation(async (cb: (tx: TransactionContext) => Promise<unknown>) => cb({} as TransactionContext)),
  } as unknown as PrismaService;
}

function buildOutboxStub(): IOutboxRepository {
  return { save: jest.fn().mockResolvedValue(undefined) } as unknown as IOutboxRepository;
}

function buildTeilnehmerStub(found: boolean): IEinsatzTeilnehmerRepository {
  const teilnehmer: EinsatzTeilnehmerDto = {
    id: 'teilnehmer-1',
    einsatzId: EINSATZ_ID,
    userId: USER_ID,
    einsatzPersonId: 'person-1',
    personVorname: 'Test',
    personNachname: 'User',
    personFunkrufname: null,
    personFunktion: 'Sicherheitsbeauftragter',
    joinedAt: new Date(),
    leftAt: null,
  };
  return {
    findByEinsatzAndUser: jest.fn().mockResolvedValue(found ? teilnehmer : null),
  } as unknown as IEinsatzTeilnehmerRepository;
}

function buildActiveAggregate(version = 1, profil: 'BASIS' | 'INFEKTION' | 'VU' | 'CBRN_PATIENT' | 'VOLLSCHUTZ' = 'BASIS', id: string = 'clw3h8x9y0000qwertyuipsa001'): PsaProfilZuweisung {
  const result = PsaProfilZuweisung.reconstitute({
    id,
    einsatzId: EINSATZ_ID,
    einheitId: EINHEIT_ID,
    profil,
    gueltigVon: new Date('2026-04-24T10:00:00.000Z'),
    gueltigBis: null,
    aktiviertVonUserId: USER_ID,
    begruendung: 'Initial',
    propagationGroupId: 'old-group',
    version,
  });
  if (result.isFailure || !result.value) throw new Error(`Setup defekt: ${result.error}`);
  return result.value;
}

function buildRepoStub(overrides: Partial<jest.Mocked<IPsaProfilZuweisungRepository>> = {}): jest.Mocked<IPsaProfilZuweisungRepository> {
  return {
    findActiveByEinheit: jest.fn().mockResolvedValue(Result.ok(null)),
    findByZuweisungId: jest.fn().mockResolvedValue(Result.ok(null)),
    saveActivation: jest.fn().mockResolvedValue(Result.ok(undefined)),
    closeActiveZuweisung: jest.fn().mockResolvedValue(Result.ok(undefined)),
    closeAndCreateNext: jest.fn().mockResolvedValue(Result.ok(undefined)),
    ...overrides,
  } as jest.Mocked<IPsaProfilZuweisungRepository>;
}

function buildEinheitRepoStub(): IEinsatzEinheitRepository {
  // Default: jede angefragte Einheit existiert und gehört zum Test-Einsatz.
  // Tests können den Stub über `overrides.einheitRepo` ersetzen, um Cross-
  // Einsatz-Membership-Verstöße zu simulieren.
  return {
    findById: jest.fn().mockImplementation(async (id: string) => Result.ok({ id, einsatzId: EINSATZ_ID })),
  } as unknown as IEinsatzEinheitRepository;
}

function buildHandler(overrides: { repo?: IPsaProfilZuweisungRepository; teilnehmerRepo?: IEinsatzTeilnehmerRepository; einheitRepo?: IEinsatzEinheitRepository } = {}): ChangePsaProfilHandler {
  const handler = new ChangePsaProfilHandler(
    buildPrismaStub(),
    buildOutboxStub(),
    overrides.repo ?? buildRepoStub(),
    overrides.teilnehmerRepo ?? buildTeilnehmerStub(true),
    overrides.einheitRepo ?? buildEinheitRepoStub(),
    NOOP_LOGGER,
  );
  return handler;
}

describe('ChangePsaProfilHandler (Story 3.1)', () => {
  describe('Caller-Authorization (AC6 Defense-in-Depth)', () => {
    it('liefert UnzulaessigeEinheitenZuordnung-Sentinel, wenn Caller kein Teilnehmer ist', async () => {
      const handler = buildHandler({ teilnehmerRepo: buildTeilnehmerStub(false) });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'BASIS', aktivieren: true }], 'Routine BASIS', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.NOT_TEILNEHMER);
    });
  });

  describe('Validation', () => {
    it('lehnt einheitIds.length === 0 ab', async () => {
      const handler = buildHandler();
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [], [{ profil: 'BASIS', aktivieren: true }], 'Routine', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.EINHEIT_REQUIRED);
    });

    it('akzeptiert N=50 (Boundary, Story 3.2 AC10 Defense-Cap)', async () => {
      // Boundary-Test: genau am Cap muss der Command durchlaufen.
      const handler = buildHandler();
      const einheitIds = Array.from({ length: 50 }, (_, i) => `clw3h8x9y0000qwertyui0d${String(i).padStart(3, '0')}`);
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, einheitIds, [{ profil: 'BASIS', aktivieren: true }], 'Bulk-Sweep am Cap', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isSuccess).toBe(true);
    });

    it('akzeptiert N=51 NICHT (Defense-Cap, Story 3.2 AC10)', async () => {
      const handler = buildHandler();
      const einheitIds = Array.from({ length: 51 }, (_, i) => `clw3h8x9y0000qwertyui0e${String(i).padStart(3, '0')}`);
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, einheitIds, [{ profil: 'BASIS', aktivieren: true }], 'Bulk-Sweep', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.TOO_MANY_EINHEITEN);
    });

    it('lehnt einheitId aus fremdem Einsatz ab (P1 Cross-Einsatz-Membership)', async () => {
      // Defense-in-Depth: einheitRepo liefert eine Einheit, die einem anderen
      // Einsatz gehört → Handler muss EINHEIT_NOT_IN_EINSATZ-Sentinel liefern,
      // bevor irgendeine PSA-Mutation passiert.
      const fremderEinheitRepo = {
        findById: jest.fn().mockResolvedValue(Result.ok({ id: EINHEIT_ID, einsatzId: 'clw3h8x9y0000fremderEINSATZ01' })),
      } as unknown as IEinsatzEinheitRepository;
      const handler = buildHandler({ einheitRepo: fremderEinheitRepo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'BASIS', aktivieren: true }], 'Cross-Einsatz-Versuch', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.EINHEIT_NOT_IN_EINSATZ);
    });

    it('lehnt einheitId ab, wenn die Einheit gar nicht existiert (P1)', async () => {
      const fehlendEinheitRepo = {
        findById: jest.fn().mockResolvedValue(Result.ok(null)),
      } as unknown as IEinsatzEinheitRepository;
      const handler = buildHandler({ einheitRepo: fehlendEinheitRepo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'BASIS', aktivieren: true }], 'fehlende Einheit', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.EINHEIT_NOT_IN_EINSATZ);
    });

    it('lehnt doppelte einheitId in einer Bulk-Operation ab', async () => {
      const handler = buildHandler();
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID, EINHEIT_ID], [{ profil: 'BASIS', aktivieren: true }], 'Routine', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.DUPLICATE_EINHEIT);
    });

    it('lehnt leere Toggle-Liste ab', async () => {
      const handler = buildHandler();
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [], 'Routine', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.TOGGLES_REQUIRED);
    });

    it('lehnt Duplikat-Profil im Toggle-Set ab', async () => {
      const handler = buildHandler();
      const cmd = new ChangePsaProfilCommand(
        EINSATZ_ID,
        [EINHEIT_ID],
        [
          { profil: 'BASIS', aktivieren: true },
          { profil: 'BASIS', aktivieren: false, expectedVersion: 1 },
        ],
        'Routine',
        USER_ID,
      );
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.TOGGLES_REQUIRED);
    });
  });

  describe('Pure-Aktivierung (kein Vor-Profil)', () => {
    it('legt neue aktive Zuweisung an, ignoriert expectedVersion, liefert AKTIVIERT-Result', async () => {
      const repo = buildRepoStub();
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'INFEKTION', aktivieren: true }], 'Patient mit Infektionsverdacht', USER_ID);

      const result = await handler.execute(cmd);

      expect(result.isSuccess).toBe(true);
      expect(repo.saveActivation).toHaveBeenCalledTimes(1);
      expect(result.value!.affectedZuweisungen).toEqual([expect.objectContaining({ profil: 'INFEKTION', aktion: 'AKTIVIERT', version: 1 })]);
      expect(typeof result.value!.propagationGroupId).toBe('string');
    });
  });

  describe('Pure-Deaktivierung', () => {
    it('schließt bestehende aktive Row und liefert DEAKTIVIERT-Result', async () => {
      const active = buildActiveAggregate(1);
      const repo = buildRepoStub({
        findActiveByEinheit: jest.fn().mockResolvedValue(Result.ok(active)),
      });
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'BASIS', aktivieren: false, expectedVersion: 1 }], 'Lage entschärft', USER_ID);

      const result = await handler.execute(cmd);

      expect(result.isSuccess).toBe(true);
      expect(repo.closeActiveZuweisung).toHaveBeenCalledWith(active, 1, expect.any(Object));
      expect(result.value!.affectedZuweisungen).toEqual([expect.objectContaining({ profil: 'BASIS', aktion: 'DEAKTIVIERT', version: 2 })]);
    });

    it('Deaktivierung ohne aktive Zuweisung → silenter No-Op (D2 Set-Operation-Semantik)', async () => {
      // Story 3.2 D2: Bulk-Set-Operation "Profil deaktivieren auf allen N Einheiten"
      // soll Einheiten ohne aktives Profil silent überspringen, statt die ganze
      // TX an einem ACTIVE_NOT_FOUND zu reißen. Symmetrisch zum Aktivierungs-No-Op.
      const repo = buildRepoStub({ findActiveByEinheit: jest.fn().mockResolvedValue(Result.ok(null)) });
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'BASIS', aktivieren: false, expectedVersion: 1 }], 'Begründung', USER_ID);

      const result = await handler.execute(cmd);
      expect(result.isSuccess).toBe(true);
      expect(result.value!.affectedZuweisungen).toEqual([]);
      expect(repo.closeActiveZuweisung).not.toHaveBeenCalled();
    });

    it('lehnt Deaktivierung ohne expectedVersion ab', async () => {
      const active = buildActiveAggregate();
      const repo = buildRepoStub({ findActiveByEinheit: jest.fn().mockResolvedValue(Result.ok(active)) });
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'BASIS', aktivieren: false }], 'kein OCC-Token', USER_ID);

      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(CHANGE_PSA_PROFIL_ERROR_CODES.EXPECTED_VERSION_REQUIRED);
    });

    it('reicht ConflictDetected aus dem Aggregate hoch (Lost-Update auf Aggregate-Ebene)', async () => {
      const active = buildActiveAggregate(5);
      const repo = buildRepoStub({ findActiveByEinheit: jest.fn().mockResolvedValue(Result.ok(active)) });
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'BASIS', aktivieren: false, expectedVersion: 1 }], 'Race', USER_ID);

      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      // Story 3.2 (AC5): Sentinel ist mit `:einheit=…:profil=…` annotiert,
      // damit der Controller die Felder im 409-Context weiterreichen kann —
      // die Annotation wird bereits im Single-Pfad emittiert (wir
      // unterscheiden im Handler nicht zwischen Single und Bulk).
      expect(result.error).toContain(CHANGE_PSA_PROFIL_ERROR_CODES.CONFLICT_DETECTED);
      expect(result.error).toContain(`einheit=${EINHEIT_ID}`);
      expect(result.error).toContain('profil=BASIS');
    });

    it('reicht DUPLICATE-Sentinel aus dem Repo hoch (AC8 Race-Slip)', async () => {
      // Pure-Aktivierung mit Repo-Race
      const repo = buildRepoStub({
        saveActivation: jest.fn().mockResolvedValue(Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.DUPLICATE_ACTIVE)),
      });
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'INFEKTION', aktivieren: true }], 'Race', USER_ID);

      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(CHANGE_PSA_PROFIL_ERROR_CODES.DUPLICATE_ACTIVE);
      expect(result.error).toContain(`einheit=${EINHEIT_ID}`);
      expect(result.error).toContain('profil=INFEKTION');
    });
  });

  describe('Multi-Toggle in einem Command (z. B. INFEKTION→ON + VU→OFF)', () => {
    it('führt beide Pfade in derselben TX aus, propagationGroupId wird vererbt', async () => {
      // Saubere `reconstitute()`-basierte Setup statt `Object.assign` — Code-Review P-23.
      const activeVu = buildActiveAggregate(1, 'VU', 'clw3h8x9y0000qwertyuipsav002');

      const findActive = jest.fn().mockImplementation(async (_einsatzId: string, _einheitId: string, profil: string) => {
        if (profil === 'VU') return Result.ok(activeVu);
        return Result.ok(null);
      });
      const repo = buildRepoStub({ findActiveByEinheit: findActive });
      const handler = buildHandler({ repo });

      const cmd = new ChangePsaProfilCommand(
        EINSATZ_ID,
        [EINHEIT_ID],
        [
          { profil: 'INFEKTION', aktivieren: true },
          { profil: 'VU', aktivieren: false, expectedVersion: 1 },
        ],
        'Sektor wechselt zu Sani',
        USER_ID,
      );

      const result = await handler.execute(cmd);
      expect(result.isSuccess).toBe(true);
      expect(result.value!.affectedZuweisungen).toHaveLength(2);
      // Single propagationGroupId für alle affected entries — Code-Review P-24
      // (vorher Tautologie wegen `map(() => …)`).
      expect(typeof result.value!.propagationGroupId).toBe('string');
      expect(result.value!.propagationGroupId.length).toBeGreaterThan(0);
      // Affected entries sind beide unter derselben Gruppen-ID dispatcht — was
      // wir verifizieren, indem wir die Repo-Aufrufe inspizieren (saveActivation
      // schreibt ein Aggregate, dessen `propagationGroupId` mit der Result-
      // Gruppen-ID übereinstimmen muss).
      expect(repo.saveActivation).toHaveBeenCalledTimes(1);
      expect(repo.closeActiveZuweisung).toHaveBeenCalledTimes(1);
      const savedAggregate = repo.saveActivation.mock.calls[0]?.[0];
      expect(savedAggregate?.propagationGroupId).toBe(result.value!.propagationGroupId);
    });

    it('Reaktivierung eines bereits aktiven Profils ist silenter No-Op (DEC-4)', async () => {
      // Code-Review DEC-4: wenn `findActiveByEinheit` für das Toggle-Profil
      // eine aktive Row liefert und das Toggle `aktivieren: true` setzt,
      // behandelt der Handler den Pfad als No-Op (kein closeAndCreateNext).
      const active = buildActiveAggregate(3, 'INFEKTION', 'clw3h8x9y0000qwertyuipsai003');
      const repo = buildRepoStub({ findActiveByEinheit: jest.fn().mockResolvedValue(Result.ok(active)) });
      const handler = buildHandler({ repo });

      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [EINHEIT_ID], [{ profil: 'INFEKTION', aktivieren: true }], 'Bestätige Status', USER_ID);
      const result = await handler.execute(cmd);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.affectedZuweisungen).toEqual([]);
      expect(repo.saveActivation).not.toHaveBeenCalled();
      expect(repo.closeActiveZuweisung).not.toHaveBeenCalled();
      expect(repo.closeAndCreateNext).not.toHaveBeenCalled();
    });
  });

  describe('Bulk-Multi-Einheit (Story 3.2)', () => {
    const E1 = 'clw3h8x9y0000qwertyuib0001';
    const E2 = 'clw3h8x9y0000qwertyuib0002';
    const E3 = 'clw3h8x9y0000qwertyuib0003';

    it('N=3 Einheiten, alle aktivieren → 3 affected-Einträge mit identischer propagationGroupId', async () => {
      const repo = buildRepoStub();
      const handler = buildHandler({ repo });

      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [E1, E2, E3], [{ profil: 'CBRN_PATIENT', aktivieren: true }], 'CBRN-Lage hochstufen', USER_ID);

      const result = await handler.execute(cmd);

      expect(result.isSuccess).toBe(true);
      expect(repo.saveActivation).toHaveBeenCalledTimes(3);
      expect(result.value!.affectedZuweisungen).toHaveLength(3);
      const groupId = result.value!.propagationGroupId;
      expect(groupId.length).toBeGreaterThan(0);
      // Alle saveActivation-Calls müssen denselben propagationGroupId tragen.
      const savedGroupIds = repo.saveActivation.mock.calls.map((call) => (call[0] as PsaProfilZuweisung).propagationGroupId);
      expect(new Set(savedGroupIds).size).toBe(1);
      expect(savedGroupIds[0]).toBe(groupId);
      // Affected-Einträge tragen alle 3 Einheiten in der Reihenfolge des Inputs.
      expect(result.value!.affectedZuweisungen.map((a) => a.einheitId)).toEqual([E1, E2, E3]);
      expect(result.value!.affectedZuweisungen.every((a) => a.aktion === 'AKTIVIERT')).toBe(true);
    });

    it('N=3, jede Einheit M=2 Toggles → 6 affected-Einträge unter derselben Group-ID', async () => {
      const repo = buildRepoStub();
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(
        EINSATZ_ID,
        [E1, E2, E3],
        [
          { profil: 'CBRN_PATIENT', aktivieren: true },
          { profil: 'INFEKTION', aktivieren: true },
        ],
        'Doppelte CBRN+Infekt-Aktivierung',
        USER_ID,
      );
      const result = await handler.execute(cmd);
      expect(result.isSuccess).toBe(true);
      expect(result.value!.affectedZuweisungen).toHaveLength(6);
      const groupIds = new Set(repo.saveActivation.mock.calls.map((call) => (call[0] as PsaProfilZuweisung).propagationGroupId));
      expect(groupIds.size).toBe(1);
    });

    it('N=3, mittlere Einheit hat Lost-Update → ganze Bulk-TX rollback, Sentinel mit einheitId und profil', async () => {
      // Alle drei Einheiten haben ein aktives BASIS-Profil. E1 und E3 sind in
      // Version 1 (matched expectedVersion=1), E2 ist bereits in Version 5
      // → Aggregate-Deactivate liefert PSA_PROFIL_CONFLICT_DETECTED.
      const activeE1 = buildActiveAggregate(1, 'BASIS', 'clw3h8x9y0000qwertyuib0a01');
      const activeE2 = buildActiveAggregate(5, 'BASIS', 'clw3h8x9y0000qwertyuib0a02');
      const activeE3 = buildActiveAggregate(1, 'BASIS', 'clw3h8x9y0000qwertyuib0a03');
      const findActive = jest.fn().mockImplementation(async (_einsatzId: string, einheitId: string) => {
        if (einheitId === E1) return Result.ok(activeE1);
        if (einheitId === E2) return Result.ok(activeE2);
        if (einheitId === E3) return Result.ok(activeE3);
        return Result.ok(null);
      });
      const repo = buildRepoStub({ findActiveByEinheit: findActive });
      const handler = buildHandler({ repo });

      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [E1, E2, E3], [{ profil: 'BASIS', aktivieren: false, expectedVersion: 1 }], 'Race', USER_ID);

      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      // Sentinel trägt einheit + profil, damit der Controller sie in den
      // 409-Body extrahieren kann.
      expect(result.error).toContain('ConflictDetected:PsaProfilZuweisung');
      expect(result.error).toContain(`einheit=${E2}`);
      expect(result.error).toContain('profil=BASIS');
    });

    it('N=3, alle ohne aktives Profil → Bulk-Deaktivierung ist silenter No-Op über alle Einheiten (D2)', async () => {
      // Story 3.2 D2: Set-Operation-Semantik. „Profil X auf allen 3 Einheiten
      // deaktivieren" mit findActive=null überall → keine Mutation, kein
      // Fehler; symmetrisch zum Aktivierungs-No-Op.
      const repo = buildRepoStub({ findActiveByEinheit: jest.fn().mockResolvedValue(Result.ok(null)) });
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [E1, E2, E3], [{ profil: 'BASIS', aktivieren: false, expectedVersion: 1 }], 'Race', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isSuccess).toBe(true);
      expect(result.value!.affectedZuweisungen).toEqual([]);
      expect(repo.closeActiveZuweisung).not.toHaveBeenCalled();
    });

    it('N=3, eine Einheit Pure-Aktivierungs-DUPLICATE → Sentinel mit einheitId + profil', async () => {
      // Erste Einheit OK (saveActivation succeeds), zweite Einheit slipt durch
      // den Application-Guard und das Repo liefert DUPLICATE → ganze TX
      // rollt zurück, Sentinel ist annotiert.
      let callIdx = 0;
      const repo = buildRepoStub({
        saveActivation: jest.fn().mockImplementation(async () => {
          callIdx++;
          if (callIdx === 2) return Result.fail<void>(CHANGE_PSA_PROFIL_ERROR_CODES.DUPLICATE_ACTIVE);
          return Result.ok(undefined);
        }),
      });
      const handler = buildHandler({ repo });
      const cmd = new ChangePsaProfilCommand(EINSATZ_ID, [E1, E2, E3], [{ profil: 'INFEKTION', aktivieren: true }], 'CBRN', USER_ID);
      const result = await handler.execute(cmd);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('ConflictDetected:DuplicateActivePsaProfilZuweisung');
      expect(result.error).toContain(`einheit=${E2}`);
      expect(result.error).toContain('profil=INFEKTION');
    });
  });
});
