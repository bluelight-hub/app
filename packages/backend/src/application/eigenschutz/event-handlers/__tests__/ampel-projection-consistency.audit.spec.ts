import 'reflect-metadata';
import { Result } from '@domain/common/result';
import { GefaehrdungsbeurteilungErstelltEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import type { IAmpelProjectionRepository, AmpelProjectionUpsertRow, AmpelProjectionReadRow, RecalculateAmpelProjectionParams } from '@domain/eigenschutz/repositories';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { RecalculateAmpelProjectionOnEigenschutzEventHandler } from '../recalculate-ampel-projection.handler';

/**
 * Story 7.10 AC3 — `AmpelProjection`-Konsistenz-Audit (NFR-P4).
 *
 * Verifiziert drei Konsistenz-Invarianten des Read-Models:
 *
 * 1. **(I) Monotonie von `letzteAenderungAm`**: Sequenzielle Events dürfen
 *    den Timestamp nicht regressieren.
 * 2. **(II) Recompute-Snapshot-Idempotenz**: Doppeltes Anwenden desselben Events
 *    darf Counter nicht verdoppeln.
 * 3. **(III) Sicherheitsregel-Versions-Awareness**: Versionssprünge führen zu
 *    Recompute aus aktuellem State, nicht zu inkrementeller Akkumulation.
 *
 * **Wichtig (Audit-Charakter):** Verletzte Invarianten werden als Finding im
 * Audit-Bericht dokumentiert (siehe `docs/audits/eigenschutz-performance-audit-2026-05-11.md`).
 * Dev-Agent fixt **nicht** in dieser Story.
 *
 * **Erkenntnis aus Code-Lesen (`prisma-ampel-projection.repository.ts#recalculateForEinheit`):**
 *
 * - Invariante (I) **nicht** enforced: `letzteAenderungAm` wird verbatim aus dem Event
 *   übernommen. Ein älter ankommendes Event regressiert den Timestamp. → `.todo`
 *   mit Bug-Reference, Finding im Audit-Bericht (Pflicht).
 * - Invariante (II) **by construction** enforced: Full-Recompute aus aktuellem DB-State,
 *   keine Inkremente. Doppel-Anwendung produziert den gleichen Endwert.
 * - Invariante (III) **by construction** enforced: Counter werden via Count-Query
 *   ermittelt — reflektiert den aktuellen Versions-Stand.
 */

const EINSATZ_ID = 'einsatz-audit-7-10';
const EINHEIT_ID = 'einheit-audit-7-10';
const USER_ID = 'user-audit-7-10';

const createLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

interface ProjectionState {
  letzteAenderungAm: Date | null;
  offeneGefaehrdungenHoch: number;
  ausstehendeRegelQuittungen: number;
}

function createRecomputingRepo(state: ProjectionState, currentCounters: () => Pick<ProjectionState, 'offeneGefaehrdungenHoch' | 'ausstehendeRegelQuittungen'>): IAmpelProjectionRepository {
  return {
    upsert: jest.fn(async (row: AmpelProjectionUpsertRow): Promise<Result<AmpelProjectionReadRow>> => {
      state.letzteAenderungAm = row.letzteAenderungAm;
      state.offeneGefaehrdungenHoch = row.offeneGefaehrdungenHoch;
      state.ausstehendeRegelQuittungen = row.ausstehendeRegelQuittungen;
      return Result.ok({ ...row, status: row.status } as AmpelProjectionReadRow);
    }),
    findByEinsatz: jest.fn(),
    recalculateForEinheit: jest.fn(async (params: RecalculateAmpelProjectionParams): Promise<Result<AmpelProjectionReadRow>> => {
      const counts = currentCounters();
      const row: AmpelProjectionUpsertRow = {
        einsatzId: params.einsatzId,
        einheitId: params.einheitId,
        status: 'GRUEN',
        aktivePsaProfile: [],
        offeneGefaehrdungenHoch: counts.offeneGefaehrdungenHoch,
        ausstehendePsaQuittungen: 0,
        ausstehendeRegelQuittungen: counts.ausstehendeRegelQuittungen,
        offeneVorfaelle: 0,
        ungeloesteRueckmeldungen: 0,
        letzteAenderungAm: params.letzteAenderungAm,
        letzteAenderungVonUserId: params.letzteAenderungVonUserId,
      };
      state.letzteAenderungAm = row.letzteAenderungAm;
      state.offeneGefaehrdungenHoch = row.offeneGefaehrdungenHoch;
      state.ausstehendeRegelQuittungen = row.ausstehendeRegelQuittungen;
      return Result.ok({ ...row } as AmpelProjectionReadRow);
    }),
  };
}

const createEinheitenRepo = () => ({ findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])) }) as unknown as IEinsatzEinheitRepository;

describe('Story 7.10 AC3 — AmpelProjection Konsistenz-Audit', () => {
  describe('Invariante (I) — Monotonie von letzteAenderungAm', () => {
    /**
     * **Audit-Finding (2026-05-11):** Diese Invariante ist im aktuellen Code
     * NICHT enforced. `prisma-ampel-projection.repository.ts#recalculateForEinheit`
     * reicht `params.letzteAenderungAm` verbatim durch in den Upsert. Ein älter
     * ankommendes Event (Out-of-Order-Replay über Outbox-Retry) würde den Timestamp
     * regressieren.
     *
     * Test ist daher als `.todo` markiert. Fix-Vorschlag im Audit-Bericht
     * (Sektion NFR-P4): `Math.max(existing.letzteAenderungAm, params.letzteAenderungAm)`
     * vor dem Upsert. Owner: `@bluelight-hub/backend`-Maintainer.
     */
    it.todo('regressiert letzteAenderungAm bei Out-of-Order-Replay nicht — Finding 7.10-NFR-P4-I');

    it('dokumentiert das aktuelle Verhalten maschinenlesbar (Repro für späteren Fix)', async () => {
      const state: ProjectionState = { letzteAenderungAm: null, offeneGefaehrdungenHoch: 0, ausstehendeRegelQuittungen: 0 };
      const repo = createRecomputingRepo(state, () => ({ offeneGefaehrdungenHoch: 0, ausstehendeRegelQuittungen: 0 }));
      const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), repo, createEinheitenRepo());

      const newerEvent = new GefaehrdungsbeurteilungErstelltEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'gef-1', null, 1, undefined, new Date('2026-05-11T10:05:00.000Z'));
      const olderEvent = new GefaehrdungsbeurteilungErstelltEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'gef-2', null, 1, undefined, new Date('2026-05-11T10:00:00.000Z'));

      await handler.handle(newerEvent);
      const afterNewer = state.letzteAenderungAm;
      await handler.handle(olderEvent);
      const afterOlder = state.letzteAenderungAm;

      expect(afterNewer).toEqual(new Date('2026-05-11T10:05:00.000Z'));
      // Aktueller Code lässt Regression zu — Audit-Finding.
      expect(afterOlder).toEqual(new Date('2026-05-11T10:00:00.000Z'));
      expect(afterOlder!.getTime()).toBeLessThan(afterNewer!.getTime());
    });
  });

  describe('Invariante (II) — Recompute-Snapshot-Idempotenz', () => {
    /**
     * Full-Recompute aus aktuellem DB-State: Doppeltes Anwenden desselben Events
     * produziert keine Counter-Verdopplung, weil die Repository-Recompute-Funktion
     * Counter aus `COUNT(*)`-Queries holt, nicht inkrementell.
     */
    it('hält Counter konstant bei doppelter Anwendung desselben Events', async () => {
      const state: ProjectionState = { letzteAenderungAm: null, offeneGefaehrdungenHoch: 0, ausstehendeRegelQuittungen: 0 };
      let count = 1;
      const repo = createRecomputingRepo(state, () => ({ offeneGefaehrdungenHoch: count, ausstehendeRegelQuittungen: 0 }));
      const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), repo, createEinheitenRepo());
      const event = new GefaehrdungsbeurteilungErstelltEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'gef-1', null, 1, undefined, new Date('2026-05-11T11:00:00.000Z'));

      await handler.handle(event);
      const afterFirst = state.offeneGefaehrdungenHoch;
      await handler.handle(event);
      const afterDouble = state.offeneGefaehrdungenHoch;

      expect(afterFirst).toBe(1);
      expect(afterDouble).toBe(1);
    });
  });

  describe('Invariante (III) — Sicherheitsregel-Versions-Awareness', () => {
    /**
     * Versionsspring V1 → V2 → V3 muss zu Recompute aus aktuellem Stand führen,
     * nicht zu inkrementeller Akkumulation. Hier modellieren wir den Counter
     * als Funktion „aktuell offene Quittungen" — wenn V3 etabliert ist, sind die
     * V1- und V2-Quittungen historisch und nicht mehr offen.
     */
    it('reflektiert nur den aktuellsten Versions-Stand in ausstehendeRegelQuittungen', async () => {
      const state: ProjectionState = { letzteAenderungAm: null, offeneGefaehrdungenHoch: 0, ausstehendeRegelQuittungen: 0 };
      const versionsLog: number[] = [];
      const repo = createRecomputingRepo(state, () => {
        const currentVersion = versionsLog[versionsLog.length - 1] ?? 0;
        return { offeneGefaehrdungenHoch: 0, ausstehendeRegelQuittungen: currentVersion === 0 ? 0 : 1 };
      });
      const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), repo, createEinheitenRepo());

      for (const version of [1, 2, 3]) {
        versionsLog.push(version);
        const ausrufen = new SicherheitsregelAusgerufenEvent(
          EINSATZ_ID,
          USER_ID,
          EINHEIT_ID,
          'regel-1',
          'regel-group-1',
          version - 1 || null,
          version,
          { created: version === 1 },
          'Titel',
          'Inhalt',
          undefined,
          new Date(`2026-05-11T1${version}:00:00.000Z`),
        );
        await handler.handle(ausrufen);
      }

      expect(state.ausstehendeRegelQuittungen).toBe(1);
    });
  });

  describe('Bonus: Quittung-Abgegeben reduziert Counter via Recompute', () => {
    it('reflektiert Quittungs-Reduktion im Counter (Sanity-Check)', async () => {
      const state: ProjectionState = { letzteAenderungAm: null, offeneGefaehrdungenHoch: 0, ausstehendeRegelQuittungen: 1 };
      let offen = 1;
      const repo = createRecomputingRepo(state, () => ({ offeneGefaehrdungenHoch: 0, ausstehendeRegelQuittungen: offen }));
      const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), repo, createEinheitenRepo());

      offen = 0;
      const quittung = new QuittungAbgegebenEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'group-1', new Date('2026-05-11T12:00:00.000Z'), undefined, new Date('2026-05-11T12:00:00.000Z'));
      await handler.handle(quittung);

      expect(state.ausstehendeRegelQuittungen).toBe(0);
    });
  });
});
