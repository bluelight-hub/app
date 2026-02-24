import { GetBefehlMetrikenQueryHandler } from '../get-befehl-metriken.handler';
import { GetBefehlMetrikenQuery } from '../get-befehl-metriken.query';
import type { PrismaService } from '@/infrastructure/database/prisma.service';

/**
 * Unit Tests fuer GetBefehlMetrikenQueryHandler (Story 4.5).
 *
 * **Test Strategy:**
 * - Direct Instantiation (NO NestJS Test Module)
 * - Mocked PrismaService mit jest.fn()
 * - Alle 5 Metriken, Leerzustand, Zeitraum-Filter, Median-Berechnung
 */
describe('GetBefehlMetrikenQueryHandler', () => {
  let handler: GetBefehlMetrikenQueryHandler;
  let mockPrisma: {
    einsatz: { findMany: jest.Mock };
    befehl: { findMany: jest.Mock };
  };

  const vonDatum = new Date('2026-02-01T00:00:00.000Z');
  const bisDatum = new Date('2026-02-28T23:59:59.000Z');

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      einsatz: { findMany: jest.fn() },
      befehl: { findMany: jest.fn() },
    };

    // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    handler = new GetBefehlMetrikenQueryHandler(mockPrisma as any as PrismaService);
  });

  describe('Leerzustand (AC10)', () => {
    it('sollte leere Metriken zurueckgeben wenn keine Einsaetze im Zeitraum', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([]);

      const query = new GetBefehlMetrikenQuery(vonDatum, bisDatum);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      const dto = result.value!;
      expect(dto.erfassungszeitMedianSekunden).toBeNull();
      expect(dto.quittierungszeitMedianSekunden).toBeNull();
      expect(dto.papierRueckfallquoteProzent).toBe(0);
      expect(dto.adoptionsrateProzent).toBe(0);
      expect(dto.dokumentationsqualitaetProzent).toBe(0);
      expect(dto.gesamtEinsaetze).toBe(0);
      expect(dto.einsaetzeMitBefehlen).toBe(0);
      expect(dto.gesamtBefehle).toBe(0);
      expect(dto.einsatzDetails).toEqual([]);
      expect(dto.vonDatum).toEqual(vonDatum);
      expect(dto.bisDatum).toEqual(bisDatum);

      // Befehl.findMany sollte NICHT aufgerufen werden
      expect(mockPrisma.befehl.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Erfassungszeit-Metrik (AC2)', () => {
    it('sollte Median der Erfassungszeit korrekt berechnen (ungerade Anzahl)', async () => {
      const baseTime = new Date('2026-02-15T10:00:00.000Z');

      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: baseTime }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [{ zugestelltAm: new Date(baseTime.getTime() + 5000), quittiertAm: null }],
        },
        {
          id: 'b2',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [{ zugestelltAm: new Date(baseTime.getTime() + 10000), quittiertAm: null }],
        },
        {
          id: 'b3',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [{ zugestelltAm: new Date(baseTime.getTime() + 15000), quittiertAm: null }],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.isSuccess).toBe(true);
      // Werte: 5s, 10s, 15s → Median = 10s
      expect(result.value!.erfassungszeitMedianSekunden).toBe(10);
    });

    it('sollte Median der Erfassungszeit korrekt berechnen (gerade Anzahl)', async () => {
      const baseTime = new Date('2026-02-15T10:00:00.000Z');

      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: baseTime }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [{ zugestelltAm: new Date(baseTime.getTime() + 4000), quittiertAm: null }],
        },
        {
          id: 'b2',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [{ zugestelltAm: new Date(baseTime.getTime() + 8000), quittiertAm: null }],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      // Werte: 4s, 8s → Median = (4+8)/2 = 6s
      expect(result.value!.erfassungszeitMedianSekunden).toBe(6);
    });

    it('sollte null zurueckgeben wenn keine Zustellungen vorhanden', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: vonDatum,
          empfaenger: [{ zugestelltAm: null, quittiertAm: null }],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.erfassungszeitMedianSekunden).toBeNull();
    });

    it('sollte frueheste Zustellung pro Befehl verwenden (mehrere Empfaenger)', async () => {
      const baseTime = new Date('2026-02-15T10:00:00.000Z');

      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: baseTime }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [
            { zugestelltAm: new Date(baseTime.getTime() + 3000), quittiertAm: null },
            { zugestelltAm: new Date(baseTime.getTime() + 7000), quittiertAm: null },
          ],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      // Frueheste Zustellung: 3s (nicht 7s)
      expect(result.value!.erfassungszeitMedianSekunden).toBe(3);
    });
  });

  describe('Quittierungszeit-Metrik (AC3)', () => {
    it('sollte Median der Quittierungszeit korrekt berechnen', async () => {
      const baseTime = new Date('2026-02-15T10:00:00.000Z');
      const zugestelltAm = new Date(baseTime.getTime() + 5000);

      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: baseTime }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [
            { zugestelltAm, quittiertAm: new Date(zugestelltAm.getTime() + 2000) },
            { zugestelltAm, quittiertAm: new Date(zugestelltAm.getTime() + 6000) },
            { zugestelltAm, quittiertAm: new Date(zugestelltAm.getTime() + 4000) },
          ],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      // Werte: 2s, 4s, 6s → Median = 4s
      expect(result.value!.quittierungszeitMedianSekunden).toBe(4);
    });

    it('sollte null zurueckgeben wenn keine Quittierungen vorhanden', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: vonDatum,
          empfaenger: [{ zugestelltAm: new Date(), quittiertAm: null }],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.quittierungszeitMedianSekunden).toBeNull();
    });
  });

  describe('Papier-Rueckfallquote (AC4) und Adoptionsrate (AC5)', () => {
    it('sollte 0% Rueckfallquote und 100% Adoptionsrate wenn alle Einsaetze Befehle haben', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([
        { id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum },
        { id: 'e2', alarmstichwort: 'TH2', createdAt: vonDatum },
      ]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        { id: 'b1', einsatzId: 'e1', erteiltAm: vonDatum, empfaenger: [] },
        { id: 'b2', einsatzId: 'e2', erteiltAm: vonDatum, empfaenger: [] },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.papierRueckfallquoteProzent).toBe(0);
      expect(result.value!.adoptionsrateProzent).toBe(100);
    });

    it('sollte 50% Rueckfallquote und 50% Adoptionsrate wenn nur halb digital', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([
        { id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum },
        { id: 'e2', alarmstichwort: 'TH2', createdAt: vonDatum },
      ]);

      mockPrisma.befehl.findMany.mockResolvedValue([{ id: 'b1', einsatzId: 'e1', erteiltAm: vonDatum, empfaenger: [] }]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.papierRueckfallquoteProzent).toBe(50);
      expect(result.value!.adoptionsrateProzent).toBe(50);
    });

    it('sollte 100% Rueckfallquote und 0% Adoptionsrate wenn kein Einsatz Befehle hat', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([
        { id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum },
        { id: 'e2', alarmstichwort: 'TH2', createdAt: vonDatum },
      ]);

      mockPrisma.befehl.findMany.mockResolvedValue([]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.papierRueckfallquoteProzent).toBe(100);
      expect(result.value!.adoptionsrateProzent).toBe(0);
      expect(result.value!.gesamtBefehle).toBe(0);
    });
  });

  describe('Dokumentationsqualitaet (AC6)', () => {
    it('sollte 100% wenn alle Empfaenger aller Befehle quittiert haben', async () => {
      const quittiert = new Date('2026-02-15T10:05:00.000Z');

      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: vonDatum,
          empfaenger: [
            { zugestelltAm: vonDatum, quittiertAm: quittiert },
            { zugestelltAm: vonDatum, quittiertAm: quittiert },
          ],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.dokumentationsqualitaetProzent).toBe(100);
    });

    it('sollte 0% wenn kein Empfaenger quittiert hat', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: vonDatum,
          empfaenger: [
            { zugestelltAm: vonDatum, quittiertAm: null },
            { zugestelltAm: vonDatum, quittiertAm: null },
          ],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.dokumentationsqualitaetProzent).toBe(0);
    });

    it('sollte 50% wenn nur ein von zwei Befehlen vollstaendig quittiert', async () => {
      const quittiert = new Date('2026-02-15T10:05:00.000Z');

      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: vonDatum,
          empfaenger: [{ zugestelltAm: vonDatum, quittiertAm: quittiert }],
        },
        {
          id: 'b2',
          einsatzId: 'e1',
          erteiltAm: vonDatum,
          empfaenger: [{ zugestelltAm: vonDatum, quittiertAm: null }],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.dokumentationsqualitaetProzent).toBe(50);
    });

    it('sollte teilweise Quittierung korrekt zaehlen (nicht alle Empfaenger)', async () => {
      const quittiert = new Date('2026-02-15T10:05:00.000Z');

      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: vonDatum,
          empfaenger: [
            { zugestelltAm: vonDatum, quittiertAm: quittiert },
            { zugestelltAm: vonDatum, quittiertAm: null }, // Einer fehlt
          ],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      // 0 von 1 Befehl vollstaendig quittiert
      expect(result.value!.dokumentationsqualitaetProzent).toBe(0);
    });
  });

  describe('Pro-Einsatz-Breakdown (AC8)', () => {
    it('sollte Metriken pro Einsatz korrekt aufschluesseln', async () => {
      const baseTime = new Date('2026-02-15T10:00:00.000Z');
      const zustellung = new Date(baseTime.getTime() + 5000);
      const quittierung = new Date(zustellung.getTime() + 3000);

      mockPrisma.einsatz.findMany.mockResolvedValue([
        { id: 'e1', alarmstichwort: 'TH1', createdAt: baseTime },
        { id: 'e2', alarmstichwort: 'Brand', createdAt: baseTime },
      ]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [{ zugestelltAm: zustellung, quittiertAm: quittierung }],
        },
        {
          id: 'b2',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [{ zugestelltAm: zustellung, quittiertAm: quittierung }],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.einsatzDetails).toHaveLength(2);

      const e1Detail = result.value!.einsatzDetails.find((d) => d.einsatzId === 'e1');
      expect(e1Detail).toBeDefined();
      expect(e1Detail!.alarmstichwort).toBe('TH1');
      expect(e1Detail!.befehlAnzahl).toBe(2);
      expect(e1Detail!.erfassungszeitMedianSekunden).toBe(5);
      expect(e1Detail!.quittierungszeitMedianSekunden).toBe(3);
      expect(e1Detail!.dokumentationsqualitaetProzent).toBe(100);

      const e2Detail = result.value!.einsatzDetails.find((d) => d.einsatzId === 'e2');
      expect(e2Detail).toBeDefined();
      expect(e2Detail!.befehlAnzahl).toBe(0);
      expect(e2Detail!.erfassungszeitMedianSekunden).toBeNull();
    });
  });

  describe('Kontext-Felder', () => {
    it('sollte Kontext-Felder korrekt befuellen', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([
        { id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum },
        { id: 'e2', alarmstichwort: 'TH2', createdAt: vonDatum },
        { id: 'e3', alarmstichwort: 'Brand', createdAt: vonDatum },
      ]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        { id: 'b1', einsatzId: 'e1', erteiltAm: vonDatum, empfaenger: [] },
        { id: 'b2', einsatzId: 'e1', erteiltAm: vonDatum, empfaenger: [] },
        { id: 'b3', einsatzId: 'e2', erteiltAm: vonDatum, empfaenger: [] },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.gesamtEinsaetze).toBe(3);
      expect(result.value!.einsaetzeMitBefehlen).toBe(2);
      expect(result.value!.gesamtBefehle).toBe(3);
      expect(result.value!.vonDatum).toEqual(vonDatum);
      expect(result.value!.bisDatum).toEqual(bisDatum);
    });
  });

  describe('Median-Berechnung Edge Cases', () => {
    it('sollte Median korrekt bei einzelnem Wert berechnen', async () => {
      const baseTime = new Date('2026-02-15T10:00:00.000Z');

      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: 'TH1', createdAt: baseTime }]);

      mockPrisma.befehl.findMany.mockResolvedValue([
        {
          id: 'b1',
          einsatzId: 'e1',
          erteiltAm: baseTime,
          empfaenger: [{ zugestelltAm: new Date(baseTime.getTime() + 7000), quittiertAm: null }],
        },
      ]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.erfassungszeitMedianSekunden).toBe(7);
    });
  });

  describe('Zeitraum-Filter', () => {
    it('sollte nur nicht-archivierte Einsaetze im Zeitraum beruecksichtigen', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([]);

      await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(mockPrisma.einsatz.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: vonDatum, lte: bisDatum },
          archivedAt: null,
        },
        select: { id: true, alarmstichwort: true, createdAt: true },
      });
    });

    it('sollte nur Befehle der gefundenen Einsaetze laden', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([
        { id: 'e1', alarmstichwort: 'TH1', createdAt: vonDatum },
        { id: 'e2', alarmstichwort: 'TH2', createdAt: vonDatum },
      ]);

      mockPrisma.befehl.findMany.mockResolvedValue([]);

      await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(mockPrisma.befehl.findMany).toHaveBeenCalledWith({
        where: {
          einsatzId: { in: ['e1', 'e2'] },
        },
        select: {
          id: true,
          einsatzId: true,
          erteiltAm: true,
          empfaenger: {
            select: { zugestelltAm: true, quittiertAm: true },
          },
        },
      });
    });
  });

  describe('Einsatz ohne Alarmstichwort', () => {
    it('sollte leeren String als Alarmstichwort verwenden wenn null', async () => {
      mockPrisma.einsatz.findMany.mockResolvedValue([{ id: 'e1', alarmstichwort: null, createdAt: vonDatum }]);

      mockPrisma.befehl.findMany.mockResolvedValue([]);

      const result = await handler.execute(new GetBefehlMetrikenQuery(vonDatum, bisDatum));

      expect(result.value!.einsatzDetails[0].alarmstichwort).toBe('');
    });
  });
});
