import { GetBefehlHistorieQueryHandler } from '../get-befehl-historie/get-befehl-historie.handler';
import { GetBefehlHistorieQuery } from '../get-befehl-historie/get-befehl-historie.query';
import { BefehlHistorieEventStatus, BefehlHistorieEventTyp } from '@/application/befehl/dto/befehl-historie.dto';
import { BEFEHL_ERROR_CODES } from '@/application/befehl/errors/befehl-error.codes';
import type { PrismaService } from '@/infrastructure/database/prisma.service';

/**
 * Unit Tests fuer GetBefehlHistorieQueryHandler.
 *
 * Testet die Konstruktion der Befehlshistorie-Timeline aus DB-Daten.
 * Die Timeline wird im Paket-Tracking-Style dargestellt.
 *
 * **Story 4.2: Befehlshistorie-Timeline**
 *
 * **Test-Szenarien:**
 * 1. Happy Path: Befehl mit allen Event-Typen
 * 2. Nur ERTEILT (neuer Befehl)
 * 3. Teilquittierung
 * 4. Vollstaendig quittiert
 * 5. Mit Korrektur
 * 6. Mit Rueckfrage-Kommentaren
 * 7. NOT_FOUND
 * 8. Status-Berechnung (letzter ABGESCHLOSSEN = AKTUELL)
 */
describe('GetBefehlHistorieQueryHandler', () => {
  let handler: GetBefehlHistorieQueryHandler;
  let mockPrisma: jest.Mocked<PrismaService>;

  const befehlId = 'test-befehl-id';

  /** Erstellt ein Mock-Befehl-Objekt mit konfigurierbaren Feldern. */
  const createMockBefehl = (
    overrides: Partial<{
      id: string;
      nummer: string;
      status: string;
      befehlsgeberName: string;
      erteiltAm: Date;
      empfaenger: Array<{
        name: string;
        zugestelltAm: Date | null;
        quittiertAm: Date | null;
        quittierungArt: string | null;
      }>;
      kommentare: Array<{
        text: string;
        author: { username: string } | null;
        createdAt: Date;
        isRueckfrage: boolean;
      }>;
      korrekturen: Array<{
        id: string;
        nummer: string;
        erteiltAm: Date;
      }>;
    }> = {},
  ) => ({
    id: overrides.id ?? befehlId,
    nummer: overrides.nummer ?? 'B-001',
    status: overrides.status ?? 'ERTEILT',
    befehlsgeberName: overrides.befehlsgeberName ?? 'EL Mueller',
    erteiltAm: overrides.erteiltAm ?? new Date('2026-02-20T10:00:00.000Z'),
    empfaenger: overrides.empfaenger ?? [],
    kommentare: overrides.kommentare ?? [],
    korrekturen: overrides.korrekturen ?? [],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      befehl: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    handler = new GetBefehlHistorieQueryHandler(mockPrisma);
  });

  describe('Happy Path: Befehl mit allen Event-Typen', () => {
    it('sollte komplette Timeline mit allen Event-Typen zurueckgeben', async () => {
      const erteiltAm = new Date('2026-02-20T10:00:00.000Z');
      const zugestelltAm = new Date('2026-02-20T10:05:00.000Z');
      const quittiertAm = new Date('2026-02-20T10:10:00.000Z');
      const kommentarAm = new Date('2026-02-20T10:08:00.000Z');
      const korrekturAm = new Date('2026-02-20T10:15:00.000Z');

      const mockBefehl = createMockBefehl({
        status: 'KORRIGIERT',
        empfaenger: [{ name: 'ZF Meier', zugestelltAm, quittiertAm, quittierungArt: 'VERSTANDEN' }],
        kommentare: [{ text: 'Welches Material?', author: { username: 'ZF Meier' }, createdAt: kommentarAm, isRueckfrage: true }],
        korrekturen: [{ id: 'korr-1', nummer: 'B-002', erteiltAm: korrekturAm }],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.befehlId).toBe(befehlId);
      expect(result.value?.befehlNummer).toBe('B-001');
      expect(result.value?.aktuellerStatus).toBe('KORRIGIERT');

      const events = result.value?.events;
      // ERTEILT, ZUGESTELLT, KOMMENTAR, QUITTIERT, KORRIGIERT (chronologisch)
      expect(events).toHaveLength(5);

      // Chronologische Reihenfolge pruefen
      expect(events[0].typ).toBe(BefehlHistorieEventTyp.ERTEILT);
      expect(events[0].zeitpunkt).toEqual(erteiltAm);

      expect(events[1].typ).toBe(BefehlHistorieEventTyp.ZUGESTELLT);
      expect(events[1].zeitpunkt).toEqual(zugestelltAm);

      expect(events[2].typ).toBe(BefehlHistorieEventTyp.KOMMENTAR);
      expect(events[2].zeitpunkt).toEqual(kommentarAm);
      expect(events[2].details).toBe('Welches Material?');

      expect(events[3].typ).toBe(BefehlHistorieEventTyp.QUITTIERT);
      expect(events[3].zeitpunkt).toEqual(quittiertAm);
      expect(events[3].akteur).toBe('ZF Meier');

      expect(events[4].typ).toBe(BefehlHistorieEventTyp.KORRIGIERT);
      expect(events[4].zeitpunkt).toEqual(korrekturAm);
      expect(events[4].korrekturBefehlNummer).toBe('B-002');
    });
  });

  describe('Nur ERTEILT (neuer Befehl)', () => {
    it('sollte nur ERTEILT-Event und AUSSTEHEND-Events zurueckgeben', async () => {
      const mockBefehl = createMockBefehl({
        empfaenger: [
          { name: 'ZF Meier', zugestelltAm: null, quittiertAm: null, quittierungArt: null },
          { name: 'GF Schmidt', zugestelltAm: null, quittiertAm: null, quittierungArt: null },
        ],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const events = result.value?.events;

      // 1 ERTEILT (AKTUELL) + 2 ZUGESTELLT AUSSTEHEND
      expect(events).toHaveLength(3);

      // ERTEILT ist das letzte (einzige) ABGESCHLOSSEN → AKTUELL
      expect(events[0].typ).toBe(BefehlHistorieEventTyp.ERTEILT);
      expect(events[0].status).toBe(BefehlHistorieEventStatus.AKTUELL);

      // AUSSTEHEND Events am Ende
      expect(events[1].typ).toBe(BefehlHistorieEventTyp.ZUGESTELLT);
      expect(events[1].status).toBe(BefehlHistorieEventStatus.AUSSTEHEND);
      expect(events[1].zeitpunkt).toBeNull();

      expect(events[2].typ).toBe(BefehlHistorieEventTyp.ZUGESTELLT);
      expect(events[2].status).toBe(BefehlHistorieEventStatus.AUSSTEHEND);
    });
  });

  describe('Teilquittierung', () => {
    it('sollte Mischung aus ABGESCHLOSSEN und AUSSTEHEND Events zeigen', async () => {
      const zugestelltAm1 = new Date('2026-02-20T10:05:00.000Z');
      const zugestelltAm2 = new Date('2026-02-20T10:06:00.000Z');
      const quittiertAm = new Date('2026-02-20T10:10:00.000Z');

      const mockBefehl = createMockBefehl({
        status: 'ZUGESTELLT',
        empfaenger: [
          { name: 'ZF Meier', zugestelltAm: zugestelltAm1, quittiertAm, quittierungArt: 'VERSTANDEN' },
          { name: 'GF Schmidt', zugestelltAm: zugestelltAm2, quittiertAm: null, quittierungArt: null },
        ],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const events = result.value?.events;

      // Completed: ERTEILT, ZUGESTELLT (Meier), ZUGESTELLT (Schmidt), QUITTIERT (Meier)
      // Pending: QUITTIERT (Schmidt)
      const completedEvents = events.filter((e) => e.status !== BefehlHistorieEventStatus.AUSSTEHEND);
      const pendingEvents = events.filter((e) => e.status === BefehlHistorieEventStatus.AUSSTEHEND);

      expect(completedEvents).toHaveLength(4);
      expect(pendingEvents).toHaveLength(1);
      expect(pendingEvents[0].beschreibung).toContain('GF Schmidt');
      expect(pendingEvents[0].typ).toBe(BefehlHistorieEventTyp.QUITTIERT);
    });
  });

  describe('Vollstaendig quittiert', () => {
    it('sollte alle Events als ABGESCHLOSSEN/AKTUELL zeigen, keine AUSSTEHEND', async () => {
      const zugestelltAm = new Date('2026-02-20T10:05:00.000Z');
      const quittiertAm = new Date('2026-02-20T10:10:00.000Z');

      const mockBefehl = createMockBefehl({
        status: 'QUITTIERT',
        empfaenger: [{ name: 'ZF Meier', zugestelltAm, quittiertAm, quittierungArt: 'VERSTANDEN' }],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const events = result.value?.events;

      // ERTEILT, ZUGESTELLT, QUITTIERT — alle ABGESCHLOSSEN, letzter AKTUELL
      expect(events).toHaveLength(3);

      const pendingEvents = events.filter((e) => e.status === BefehlHistorieEventStatus.AUSSTEHEND);
      expect(pendingEvents).toHaveLength(0);

      // Letztes Event = AKTUELL
      expect(events[events.length - 1].status).toBe(BefehlHistorieEventStatus.AKTUELL);
      expect(events[events.length - 1].typ).toBe(BefehlHistorieEventTyp.QUITTIERT);
    });
  });

  describe('Mit Korrektur', () => {
    it('sollte KORRIGIERT-Event mit Korrekturbefehl-Nummer enthalten', async () => {
      const korrekturAm = new Date('2026-02-20T11:00:00.000Z');

      const mockBefehl = createMockBefehl({
        status: 'KORRIGIERT',
        empfaenger: [],
        korrekturen: [{ id: 'korr-1', nummer: 'B-003', erteiltAm: korrekturAm }],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const events = result.value?.events;

      const korrigiertEvent = events.find((e) => e.typ === BefehlHistorieEventTyp.KORRIGIERT);
      expect(korrigiertEvent).toBeDefined();
      expect(korrigiertEvent?.korrekturBefehlNummer).toBe('B-003');
      expect(korrigiertEvent?.beschreibung).toContain('B-003');
      expect(korrigiertEvent?.zeitpunkt).toEqual(korrekturAm);
    });
  });

  describe('Mit Rueckfrage-Kommentaren', () => {
    it('sollte KOMMENTAR-Events mit Details enthalten', async () => {
      const kommentar1Am = new Date('2026-02-20T10:08:00.000Z');
      const kommentar2Am = new Date('2026-02-20T10:12:00.000Z');

      const mockBefehl = createMockBefehl({
        kommentare: [
          { text: 'Welches Material soll verwendet werden?', author: { username: 'ZF Meier' }, createdAt: kommentar1Am, isRueckfrage: true },
          { text: 'Wo genau ist der Sammelplatz?', author: { username: 'GF Schmidt' }, createdAt: kommentar2Am, isRueckfrage: true },
        ],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const kommentarEvents = result.value?.events.filter((e) => e.typ === BefehlHistorieEventTyp.KOMMENTAR);
      expect(kommentarEvents).toHaveLength(2);
      expect(kommentarEvents[0].details).toBe('Welches Material soll verwendet werden?');
      expect(kommentarEvents[1].details).toBe('Wo genau ist der Sammelplatz?');
      expect(kommentarEvents[0].beschreibung).toBe('Rückfrage von ZF Meier');
      expect(kommentarEvents[0].akteur).toBe('ZF Meier');
      expect(kommentarEvents[1].beschreibung).toBe('Rückfrage von GF Schmidt');
      expect(kommentarEvents[1].akteur).toBe('GF Schmidt');
    });
  });

  describe('NOT_FOUND', () => {
    it('sollte Result.fail mit BEFEHL_ERROR_CODES.NOT_FOUND zurueckgeben bei ungueltiger ID', async () => {
      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(null);

      const query = new GetBefehlHistorieQuery('nonexistent-id');
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(BEFEHL_ERROR_CODES.NOT_FOUND);
    });
  });

  describe('Status-Berechnung', () => {
    it('sollte den letzten ABGESCHLOSSEN Event als AKTUELL markieren', async () => {
      const zugestelltAm = new Date('2026-02-20T10:05:00.000Z');

      const mockBefehl = createMockBefehl({
        empfaenger: [{ name: 'ZF Meier', zugestelltAm, quittiertAm: null, quittierungArt: null }],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const events = result.value?.events;

      // ERTEILT und ZUGESTELLT sind ABGESCHLOSSEN, ZUGESTELLT ist der letzte → AKTUELL
      const completedEvents = events.filter((e) => e.status !== BefehlHistorieEventStatus.AUSSTEHEND);

      // Letzter ABGESCHLOSSEN/AKTUELL Event ist ZUGESTELLT
      expect(completedEvents[completedEvents.length - 1].typ).toBe(BefehlHistorieEventTyp.ZUGESTELLT);
      expect(completedEvents[completedEvents.length - 1].status).toBe(BefehlHistorieEventStatus.AKTUELL);

      // Erster ERTEILT ist ABGESCHLOSSEN (nicht AKTUELL)
      expect(completedEvents[0].typ).toBe(BefehlHistorieEventTyp.ERTEILT);
      expect(completedEvents[0].status).toBe(BefehlHistorieEventStatus.ABGESCHLOSSEN);

      // AUSSTEHEND: Quittierung
      const pendingEvents = events.filter((e) => e.status === BefehlHistorieEventStatus.AUSSTEHEND);
      expect(pendingEvents).toHaveLength(1);
      expect(pendingEvents[0].typ).toBe(BefehlHistorieEventTyp.QUITTIERT);
    });

    it('sollte AUSSTEHEND-Events immer nach ABGESCHLOSSEN-Events sortieren', async () => {
      const mockBefehl = createMockBefehl({
        empfaenger: [{ name: 'ZF Meier', zugestelltAm: null, quittiertAm: null, quittierungArt: null }],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const events = result.value?.events;

      // Finde Index des letzten Nicht-AUSSTEHEND und des ersten AUSSTEHEND
      const lastNonPendingIdx = events.findLastIndex((e) => e.status !== BefehlHistorieEventStatus.AUSSTEHEND);
      const firstPendingIdx = events.findIndex((e) => e.status === BefehlHistorieEventStatus.AUSSTEHEND);

      if (firstPendingIdx !== -1) {
        expect(lastNonPendingIdx).toBeLessThan(firstPendingIdx);
      }
    });
  });

  describe('QuittierungArt-Mapping', () => {
    it('sollte RUECKFRAGE als Event-Typ korrekt mappen', async () => {
      const zugestelltAm = new Date('2026-02-20T10:05:00.000Z');
      const quittiertAm = new Date('2026-02-20T10:10:00.000Z');

      const mockBefehl = createMockBefehl({
        empfaenger: [{ name: 'ZF Meier', zugestelltAm, quittiertAm, quittierungArt: 'RUECKFRAGE' }],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const rueckfrageEvent = result.value?.events.find((e) => e.typ === BefehlHistorieEventTyp.RUECKFRAGE);
      expect(rueckfrageEvent).toBeDefined();
      expect(rueckfrageEvent?.beschreibung).toContain('Rückfrage');
    });

    it('sollte NICHT_VERSTANDEN als Event-Typ korrekt mappen', async () => {
      const zugestelltAm = new Date('2026-02-20T10:05:00.000Z');
      const quittiertAm = new Date('2026-02-20T10:10:00.000Z');

      const mockBefehl = createMockBefehl({
        empfaenger: [{ name: 'ZF Meier', zugestelltAm, quittiertAm, quittierungArt: 'NICHT_VERSTANDEN' }],
      });

      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(mockBefehl);

      const query = new GetBefehlHistorieQuery(befehlId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const nichtVerstandenEvent = result.value?.events.find((e) => e.typ === BefehlHistorieEventTyp.NICHT_VERSTANDEN);
      expect(nichtVerstandenEvent).toBeDefined();
      expect(nichtVerstandenEvent?.beschreibung).toContain('Nicht verstanden');
    });
  });

  describe('Prisma Query', () => {
    it('sollte korrekte Prisma-Query mit includes ausfuehren', async () => {
      (mockPrisma.befehl.findUnique as jest.Mock).mockResolvedValue(null);

      const query = new GetBefehlHistorieQuery(befehlId);
      await handler.execute(query);

      expect(mockPrisma.befehl.findUnique).toHaveBeenCalledWith({
        where: { id: befehlId },
        include: {
          empfaenger: { orderBy: { zugestelltAm: 'asc' } },
          kommentare: {
            where: { isRueckfrage: true },
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { username: true } } },
          },
          korrekturen: {
            select: { id: true, nummer: true, erteiltAm: true },
          },
        },
      });
    });
  });
});
