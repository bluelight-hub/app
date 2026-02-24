import { Befehl } from '@domain/aggregates/befehl.aggregate';
import { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import { BefehlKommentar } from '@domain/entities/befehl-kommentar.entity';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BefehlKommentarHinzugefuegtEvent } from '@domain/events/befehl-kommentar-hinzugefuegt.event';
import { BefehlQuittiertEvent } from '@domain/events/befehl-quittiert.event';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';

// Mock CUID2 for Jest compatibility (ESM module issue)
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

/** Helper: Erstellt Standard-Props für Befehl. */
function createDefaultProps() {
  return {
    einsatzId: EinsatzId.create().value! as EinsatzId,
    auftrag: 'Sofort Wasser marsch am Brandherd',
    befehlsgeber: 'EL Müller',
    erstellerId: UserId.create().value! as UserId,
    empfaenger: [{ name: 'ZF Nord' }, { name: 'ZF Süd' }],
  };
}

/** Helper: Erstellt einen Test-Befehl mit Standardwerten. */
function createTestBefehl(overrides?: Partial<ReturnType<typeof createDefaultProps>>) {
  const props = { ...createDefaultProps(), ...overrides };
  return Befehl.create(props).value!;
}

/**
 * Helper: Erstellt einen Befehl mit empfaengerIds (für markAlsZugestellt/quittieren Tests).
 * Da markAlsZugestellt/quittieren intern UserId-Match benötigen, erstellen wir
 * Empfänger via reconstitute mit UserId.
 */
function createBefehlWithUserIds() {
  const einsatzId = EinsatzId.create().value! as EinsatzId;
  const erstellerId = UserId.create().value! as UserId;
  const empfaengerIds = [UserId.create().value! as UserId, UserId.create().value! as UserId];

  const empfaenger = empfaengerIds.map((uid) => BefehlEmpfaenger.create(uid.value, uid));

  const befehlResult = Befehl.create({
    einsatzId,
    auftrag: 'Test Auftrag',
    befehlsgeber: 'EL Test',
    erstellerId,
    empfaenger: empfaengerIds.map((uid) => ({ name: uid.value, empfaengerId: uid })),
  });
  const befehl = befehlResult.value!;

  // Wir brauchen einen Befehl mit UserIds in den Empfängern für die markAlsZugestellt/quittieren Tests
  // Da create() jetzt nur noch Namen nimmt, nutzen wir reconstitute()
  const reconstituted = Befehl.reconstitute({
    id: befehl.id,
    nummer: befehl.nummer,
    einsatzId,
    auftrag: befehl.auftrag,
    befehlsgeberName: befehl.befehlsgeberName,
    befehlsgeberId: undefined,
    erstellerId,
    status: BefehlStatus.ERTEILT(),
    erteiltAm: befehl.erteiltAm,
    empfaenger,
    kommentare: [],
  });

  return { befehl: reconstituted, empfaengerIds, einsatzId, erstellerId };
}

describe('Befehl Aggregate', () => {
  describe('create() - Factory Method', () => {
    it('sollte einen Befehl mit gültigen Props erstellen', () => {
      const props = createDefaultProps();
      const result = Befehl.create(props);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.auftrag).toBe('Sofort Wasser marsch am Brandherd');
      expect(result.value?.status.value).toBe('ERTEILT');
      expect(result.value?.empfaenger).toHaveLength(2);
      expect(result.value?.kommentare).toHaveLength(0);
      expect(result.value?.befehlsgeberName).toBe('EL Müller');
      expect(result.value?.befehlsgeberId).toBeUndefined();
    });

    it('sollte Befehlsnummer im Format B{YEAR}-{CUID-8} generieren', () => {
      const befehl = createTestBefehl();
      const year = new Date().getFullYear();
      expect(befehl.nummer).toMatch(new RegExp(`^B${year}-[a-z0-9]{8}$`));
    });

    it('sollte eindeutige Nummern für verschiedene Befehle generieren', () => {
      const b1 = createTestBefehl();
      const b2 = createTestBefehl();
      expect(b1.nummer).not.toBe(b2.nummer);
    });

    it('sollte erteiltAm-Timestamp setzen', () => {
      const before = new Date();
      const befehl = createTestBefehl();
      const after = new Date();

      expect(befehl.erteiltAm).toBeInstanceOf(Date);
      expect(befehl.erteiltAm.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(befehl.erteiltAm.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('sollte BefehlErstelltEvent emittieren', () => {
      const props = createDefaultProps();
      const befehl = Befehl.create(props).value!;
      const events = befehl.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BefehlErstelltEvent);
      const event = events[0] as BefehlErstelltEvent;
      expect(event.befehlId).toBe(befehl.id);
      expect(event.einsatzId).toBe(props.einsatzId);
      expect(event.auftrag).toBe(props.auftrag);
      expect(event.nummer).toBe(befehl.nummer);
      expect(event.empfaenger).toHaveLength(2);
      expect(event.empfaenger).toEqual(['ZF Nord', 'ZF Süd']);
    });

    it('sollte Auftrag trimmen', () => {
      const befehl = createTestBefehl({ auftrag: '  Befehl mit Leerzeichen  ' } as ReturnType<typeof createDefaultProps>);
      expect(befehl.auftrag).toBe('Befehl mit Leerzeichen');
    });

    it('sollte fehlschlagen bei leerem Auftrag', () => {
      const props = createDefaultProps();
      const result = Befehl.create({ ...props, auftrag: '' });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Auftrag ist erforderlich');
    });

    it('sollte fehlschlagen bei Whitespace-only Auftrag', () => {
      const props = createDefaultProps();
      const result = Befehl.create({ ...props, auftrag: '   ' });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Auftrag ist erforderlich');
    });

    it('sollte fehlschlagen ohne Empfänger', () => {
      const props = createDefaultProps();
      const result = Befehl.create({ ...props, empfaenger: [] });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Mindestens ein Empfänger ist erforderlich');
    });

    it('sollte originalBefehlId setzen für Korrekturbefehle', () => {
      const originalId = BefehlId.create().value! as BefehlId;
      const befehl = createTestBefehl({ originalBefehlId: originalId } as ReturnType<typeof createDefaultProps>);
      expect(befehl.originalBefehlId).toBe(originalId);
    });

    it('sollte optionale EAMZW-Felder setzen', () => {
      const props = {
        ...createDefaultProps(),
        zeitvorgabe: '15:30 Uhr',
        ereignis: 'Wohnungsbrand',
        mittel: '2 C-Rohre',
        ziel: 'Brand löschen',
        weg: 'Über Drehleiter',
      };
      const befehl = Befehl.create(props).value!;

      expect(befehl.zeitvorgabe).toBe('15:30 Uhr');
      expect(befehl.ereignis).toBe('Wohnungsbrand');
      expect(befehl.mittel).toBe('2 C-Rohre');
      expect(befehl.ziel).toBe('Brand löschen');
      expect(befehl.weg).toBe('Über Drehleiter');
    });
  });

  describe('befehlstyp - Computed Getter', () => {
    it('sollte KURZBEFEHL zurückgeben wenn nur Auftrag gesetzt', () => {
      const befehl = createTestBefehl();
      expect(befehl.befehlstyp).toBe('KURZBEFEHL');
    });

    it('sollte EAMZW zurückgeben wenn alle EAMZW-Felder gesetzt', () => {
      const props = {
        ...createDefaultProps(),
        ereignis: 'Wohnungsbrand',
        mittel: '2 C-Rohre',
        ziel: 'Brand löschen',
        weg: 'Über Drehleiter',
      };
      const befehl = Befehl.create(props).value!;
      expect(befehl.befehlstyp).toBe('EAMZW');
    });

    it('sollte ERWEITERT zurückgeben wenn nur teilweise EAMZW-Felder gesetzt', () => {
      const props = {
        ...createDefaultProps(),
        ereignis: 'Wohnungsbrand',
      };
      const befehl = Befehl.create(props).value!;
      expect(befehl.befehlstyp).toBe('ERWEITERT');
    });

    it('sollte ERWEITERT bei nur Mittel', () => {
      const props = {
        ...createDefaultProps(),
        mittel: '2 C-Rohre',
      };
      const befehl = Befehl.create(props).value!;
      expect(befehl.befehlstyp).toBe('ERWEITERT');
    });

    it('sollte ERWEITERT bei nur Ziel', () => {
      const props = {
        ...createDefaultProps(),
        ziel: 'Brand löschen',
      };
      const befehl = Befehl.create(props).value!;
      expect(befehl.befehlstyp).toBe('ERWEITERT');
    });

    it('sollte ERWEITERT bei nur Weg', () => {
      const props = {
        ...createDefaultProps(),
        weg: 'Über Drehleiter',
      };
      const befehl = Befehl.create(props).value!;
      expect(befehl.befehlstyp).toBe('ERWEITERT');
    });

    it('sollte ERWEITERT bei drei von vier EAMZW-Feldern', () => {
      const props = {
        ...createDefaultProps(),
        ereignis: 'Wohnungsbrand',
        mittel: '2 C-Rohre',
        ziel: 'Brand löschen',
        // weg fehlt
      };
      const befehl = Befehl.create(props).value!;
      expect(befehl.befehlstyp).toBe('ERWEITERT');
    });
  });

  describe('markAlsZugestellt()', () => {
    it('sollte einen Empfänger als zugestellt markieren', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.clearDomainEvents();

      const result = befehl.markAlsZugestellt(empfaengerIds[0]);

      expect(result.isSuccess).toBe(true);
      const empfaenger = befehl.empfaenger.find((e) => e.empfaengerId?.equals(empfaengerIds[0]));
      expect(empfaenger?.zugestelltAm).toBeInstanceOf(Date);
    });

    it('sollte BefehlZugestelltEvent emittieren', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.clearDomainEvents();

      befehl.markAlsZugestellt(empfaengerIds[0]);

      const events = befehl.getDomainEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]).toBeInstanceOf(BefehlZugestelltEvent);
      const event = events[0] as BefehlZugestelltEvent;
      expect(event.befehlId).toBe(befehl.id);
      expect(event.empfaengerId).toBe(empfaengerIds[0].value);
    });

    it('sollte Status zu ZUGESTELLT ändern wenn alle Empfänger zugestellt', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.clearDomainEvents();

      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);

      expect(befehl.status.value).toBe('ZUGESTELLT');
    });

    it('sollte BefehlStatusGeaendertEvent emittieren bei Transition zu ZUGESTELLT', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.clearDomainEvents();

      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);

      const events = befehl.getDomainEvents();
      const statusEvents = events.filter((e) => e instanceof BefehlStatusGeaendertEvent);
      expect(statusEvents).toHaveLength(1);
      const event = statusEvents[0] as BefehlStatusGeaendertEvent;
      expect(event.oldStatus.value).toBe('ERTEILT');
      expect(event.newStatus.value).toBe('ZUGESTELLT');
    });

    it('sollte Status NICHT ändern wenn nur teilweise zugestellt', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();

      befehl.markAlsZugestellt(empfaengerIds[0]);

      expect(befehl.status.value).toBe('ERTEILT');
    });

    it('sollte fehlschlagen bei unbekanntem Empfänger', () => {
      const { befehl } = createBefehlWithUserIds();
      const unknownId = UserId.create().value! as UserId;

      const result = befehl.markAlsZugestellt(unknownId);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Empfänger nicht gefunden');
    });

    it('sollte fehlschlagen bei bereits zugestelltem Empfänger', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.markAlsZugestellt(empfaengerIds[0]);

      const result = befehl.markAlsZugestellt(empfaengerIds[0]);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('bereits als zugestellt markiert');
    });

    it('sollte fehlschlagen bei korrigiertem Befehl', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.korrigieren();

      const result = befehl.markAlsZugestellt(empfaengerIds[0]);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('korrigierter Befehl');
    });
  });

  describe('quittieren()', () => {
    it('sollte einen Empfänger quittieren', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      // Erst zustellen, dann quittieren
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);
      befehl.clearDomainEvents();

      const result = befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');

      expect(result.isSuccess).toBe(true);
      const empfaenger = befehl.empfaenger.find((e) => e.empfaengerId?.equals(empfaengerIds[0]));
      expect(empfaenger?.quittiertAm).toBeInstanceOf(Date);
      expect(empfaenger?.quittierungArt).toBe('VERSTANDEN');
    });

    it('sollte BefehlQuittiertEvent emittieren (Story 2.1 AC2)', () => {
      const { befehl, empfaengerIds, einsatzId } = createBefehlWithUserIds();
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);
      befehl.clearDomainEvents();

      befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');

      const events = befehl.getDomainEvents();
      const quittierEvents = events.filter((e) => e instanceof BefehlQuittiertEvent);
      expect(quittierEvents).toHaveLength(1);
      const event = quittierEvents[0] as BefehlQuittiertEvent;
      expect(event.befehlId.value).toBe(befehl.id.value);
      expect(event.einsatzId.value).toBe(einsatzId.value);
      expect(event.empfaengerId.value).toBe(empfaengerIds[0].value);
      expect(event.quittierungArt).toBe('VERSTANDEN');
      expect(event.nummer).toBe(befehl.nummer);
      expect(event.quittiertAm).toBeInstanceOf(Date);
    });

    it('sollte BefehlQuittiertEvent mit korrekter QuittierungArt emittieren', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);
      befehl.clearDomainEvents();

      befehl.quittieren(empfaengerIds[0], 'RUECKFRAGE');

      const quittierEvents = befehl.getDomainEvents().filter((e) => e instanceof BefehlQuittiertEvent);
      expect(quittierEvents).toHaveLength(1);
      expect((quittierEvents[0] as BefehlQuittiertEvent).quittierungArt).toBe('RUECKFRAGE');
    });

    it('sollte Status zu QUITTIERT ändern wenn alle Empfänger quittiert haben', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);

      befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');
      befehl.quittieren(empfaengerIds[1], 'VERSTANDEN');

      expect(befehl.status.value).toBe('QUITTIERT');
    });

    it('sollte BefehlStatusGeaendertEvent bei Transition zu QUITTIERT emittieren', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);
      befehl.clearDomainEvents();

      befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');
      befehl.quittieren(empfaengerIds[1], 'RUECKFRAGE');

      const events = befehl.getDomainEvents();
      // 2 BefehlQuittiertEvents + 1 BefehlStatusGeaendertEvent
      const quittierEvents = events.filter((e) => e instanceof BefehlQuittiertEvent);
      expect(quittierEvents).toHaveLength(2);
      const statusEvents = events.filter((e) => e instanceof BefehlStatusGeaendertEvent);
      expect(statusEvents).toHaveLength(1);
      const event = statusEvents[0] as BefehlStatusGeaendertEvent;
      expect(event.oldStatus.value).toBe('ZUGESTELLT');
      expect(event.newStatus.value).toBe('QUITTIERT');
    });

    it('sollte Status NICHT ändern wenn nur teilweise quittiert', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);

      befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');

      expect(befehl.status.value).toBe('ZUGESTELLT');
    });

    it('sollte verschiedene QuittierungArten akzeptieren', () => {
      const einsatzId = EinsatzId.create().value! as EinsatzId;
      const erstellerId = UserId.create().value! as UserId;
      const empfaengerIds = [UserId.create().value! as UserId, UserId.create().value! as UserId, UserId.create().value! as UserId];
      const empfaenger = empfaengerIds.map((uid) => BefehlEmpfaenger.create(uid.value, uid));

      const befehl = Befehl.reconstitute({
        id: BefehlId.create().value! as BefehlId,
        nummer: 'B2026-test1234',
        einsatzId,
        auftrag: 'Test',
        befehlsgeberName: 'EL Test',
        befehlsgeberId: undefined,
        erstellerId,
        status: BefehlStatus.ERTEILT(),
        erteiltAm: new Date(),
        empfaenger,
        kommentare: [],
      });

      for (const id of empfaengerIds) befehl.markAlsZugestellt(id);

      befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');
      befehl.quittieren(empfaengerIds[1], 'RUECKFRAGE');
      befehl.quittieren(empfaengerIds[2], 'NICHT_VERSTANDEN');

      const empfaengerList = befehl.empfaenger;
      expect(empfaengerList.find((e) => e.empfaengerId?.equals(empfaengerIds[0]))?.quittierungArt).toBe('VERSTANDEN');
      expect(empfaengerList.find((e) => e.empfaengerId?.equals(empfaengerIds[1]))?.quittierungArt).toBe('RUECKFRAGE');
      expect(empfaengerList.find((e) => e.empfaengerId?.equals(empfaengerIds[2]))?.quittierungArt).toBe('NICHT_VERSTANDEN');
    });

    it('sollte fehlschlagen bei unbekanntem Empfänger', () => {
      const { befehl } = createBefehlWithUserIds();
      const unknownId = UserId.create().value! as UserId;

      const result = befehl.quittieren(unknownId, 'VERSTANDEN');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Empfänger nicht gefunden');
    });

    it('sollte fehlschlagen bei bereits quittiertem Empfänger', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');

      const result = befehl.quittieren(empfaengerIds[0], 'RUECKFRAGE');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('bereits quittiert');
    });

    it('sollte fehlschlagen bei korrigiertem Befehl', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.korrigieren();

      const result = befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('korrigierter Befehl');
    });

    it('sollte fehlschlagen wenn Befehl bereits QUITTIERT ist', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      // Alle Empfaenger zustellen
      for (const id of empfaengerIds) befehl.markAlsZugestellt(id);
      // Alle Empfaenger quittieren → Status wird QUITTIERT
      for (const id of empfaengerIds) befehl.quittieren(id, 'VERSTANDEN');
      expect(befehl.status.value).toBe('QUITTIERT');

      // Erneute Quittierung mit einem neuen Empfaenger-ID (der nicht existiert, aber Guard greift vorher)
      const extraEmpfaenger = UserId.create().value! as UserId;
      const result = befehl.quittieren(extraEmpfaenger, 'VERSTANDEN');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('bereits vollständig quittierter Befehl');
    });
  });

  describe('korrigieren()', () => {
    it('sollte Befehl im Status ERTEILT korrigieren können', () => {
      const befehl = createTestBefehl();
      befehl.clearDomainEvents();

      const result = befehl.korrigieren();

      expect(result.isSuccess).toBe(true);
      expect(befehl.status.value).toBe('KORRIGIERT');
    });

    it('sollte Befehl im Status ZUGESTELLT korrigieren können', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      for (const id of empfaengerIds) befehl.markAlsZugestellt(id);
      expect(befehl.status.value).toBe('ZUGESTELLT');
      befehl.clearDomainEvents();

      const result = befehl.korrigieren();

      expect(result.isSuccess).toBe(true);
      expect(befehl.status.value).toBe('KORRIGIERT');
    });

    it('sollte BefehlStatusGeaendertEvent emittieren', () => {
      const befehl = createTestBefehl();
      befehl.clearDomainEvents();

      befehl.korrigieren();

      const events = befehl.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BefehlStatusGeaendertEvent);
      const event = events[0] as BefehlStatusGeaendertEvent;
      expect(event.oldStatus.value).toBe('ERTEILT');
      expect(event.newStatus.value).toBe('KORRIGIERT');
    });

    it('sollte fehlschlagen bei Status QUITTIERT', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      for (const id of empfaengerIds) befehl.markAlsZugestellt(id);
      for (const id of empfaengerIds) befehl.quittieren(id, 'VERSTANDEN');
      expect(befehl.status.value).toBe('QUITTIERT');

      const result = befehl.korrigieren();

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige Status-Transition');
    });

    it('sollte fehlschlagen bei Status KORRIGIERT (bereits korrigiert)', () => {
      const befehl = createTestBefehl();
      befehl.korrigieren();

      const result = befehl.korrigieren();

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige Status-Transition');
    });
  });

  describe('addKommentar()', () => {
    it('sollte einen Kommentar hinzufügen', () => {
      const befehl = createTestBefehl();
      const authorId = UserId.create().value! as UserId;
      befehl.clearDomainEvents();

      const result = befehl.addKommentar(authorId, 'Bestätigt', false);

      expect(result.isSuccess).toBe(true);
      expect(befehl.kommentare).toHaveLength(1);
      expect(befehl.kommentare[0].text).toBe('Bestätigt');
      expect(befehl.kommentare[0].isRueckfrage).toBe(false);
    });

    it('sollte Rückfrage-Kommentar unterstützen', () => {
      const befehl = createTestBefehl();
      const authorId = UserId.create().value! as UserId;

      befehl.addKommentar(authorId, 'Welches Löschmittel?', true);

      expect(befehl.kommentare[0].isRueckfrage).toBe(true);
    });

    it('sollte Thread-Antworten via parentId unterstützen', () => {
      const befehl = createTestBefehl();
      const authorId = UserId.create().value! as UserId;

      befehl.addKommentar(authorId, 'Frage', true);
      const parentId = befehl.kommentare[0].id;
      befehl.addKommentar(authorId, 'Antwort', false, parentId);

      expect(befehl.kommentare).toHaveLength(2);
      expect(befehl.kommentare[1].parentId).toBe(parentId);
    });

    it('sollte BefehlKommentarHinzugefuegtEvent emittieren', () => {
      const befehl = createTestBefehl();
      const authorId = UserId.create().value! as UserId;
      befehl.clearDomainEvents();

      befehl.addKommentar(authorId, 'Test-Kommentar', false);

      const events = befehl.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BefehlKommentarHinzugefuegtEvent);
      const event = events[0] as BefehlKommentarHinzugefuegtEvent;
      expect(event.befehlId).toBe(befehl.id);
      expect(event.authorId).toBe(authorId);
      expect(event.text).toBe('Test-Kommentar');
    });

    it('sollte fehlschlagen bei leerem Text', () => {
      const befehl = createTestBefehl();
      const authorId = UserId.create().value! as UserId;

      const result = befehl.addKommentar(authorId, '', false);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Kommentar-Text ist erforderlich');
    });

    it('sollte fehlschlagen bei Whitespace-only Text', () => {
      const befehl = createTestBefehl();
      const authorId = UserId.create().value! as UserId;

      const result = befehl.addKommentar(authorId, '   ', false);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Kommentar-Text ist erforderlich');
    });

    it('sollte fehlschlagen bei ungültiger parentId', () => {
      const befehl = createTestBefehl();
      const authorId = UserId.create().value! as UserId;

      const result = befehl.addKommentar(authorId, 'Antwort', false, 'nonexistent-parent-id');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Parent-Kommentar nicht gefunden');
    });

    it('sollte Text trimmen', () => {
      const befehl = createTestBefehl();
      const authorId = UserId.create().value! as UserId;

      befehl.addKommentar(authorId, '  Trimmed Text  ', false);

      expect(befehl.kommentare[0].text).toBe('Trimmed Text');
    });
  });

  describe('canBeDeleted() - Append-Only Policy', () => {
    it('sollte IMMER false zurückgeben bei Status ERTEILT', () => {
      const befehl = createTestBefehl();
      expect(befehl.canBeDeleted()).toBe(false);
    });

    it('sollte IMMER false zurückgeben bei Status ZUGESTELLT', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      for (const id of empfaengerIds) befehl.markAlsZugestellt(id);

      expect(befehl.canBeDeleted()).toBe(false);
    });

    it('sollte IMMER false zurückgeben bei Status QUITTIERT', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      for (const id of empfaengerIds) befehl.markAlsZugestellt(id);
      for (const id of empfaengerIds) befehl.quittieren(id, 'VERSTANDEN');

      expect(befehl.canBeDeleted()).toBe(false);
    });

    it('sollte IMMER false zurückgeben bei Status KORRIGIERT', () => {
      const befehl = createTestBefehl();
      befehl.korrigieren();

      expect(befehl.canBeDeleted()).toBe(false);
    });
  });

  describe('Readonly Getter', () => {
    it('sollte alle Felder readonly bereitstellen', () => {
      const props = {
        ...createDefaultProps(),
        zeitvorgabe: '15:30',
        ereignis: 'Brand',
        mittel: '2 C-Rohre',
        ziel: 'Löschen',
        weg: 'Über Leiter',
      };
      const originalBefehlId = BefehlId.create().value! as BefehlId;
      const befehl = Befehl.create({ ...props, originalBefehlId }).value!;

      expect(befehl.id).toBeInstanceOf(BefehlId);
      expect(befehl.nummer).toBeDefined();
      expect(befehl.einsatzId).toBe(props.einsatzId);
      expect(befehl.auftrag).toBe(props.auftrag);
      expect(befehl.befehlsgeberName).toBe('EL Müller');
      expect(befehl.befehlsgeberId).toBeUndefined();
      expect(befehl.erstellerId).toBe(props.erstellerId);
      expect(befehl.status).toBeInstanceOf(BefehlStatus);
      expect(befehl.erteiltAm).toBeInstanceOf(Date);
      expect(befehl.zeitvorgabe).toBe('15:30');
      expect(befehl.ereignis).toBe('Brand');
      expect(befehl.mittel).toBe('2 C-Rohre');
      expect(befehl.ziel).toBe('Löschen');
      expect(befehl.weg).toBe('Über Leiter');
      expect(befehl.originalBefehlId).toBe(originalBefehlId);
    });

    it('sollte mutation-safe Empfänger-Kopie liefern', () => {
      const befehl = createTestBefehl();
      const empfaenger1 = befehl.empfaenger;
      const empfaenger2 = befehl.empfaenger;

      expect(empfaenger1).not.toBe(empfaenger2);
      expect(empfaenger1).toHaveLength(empfaenger2.length);
    });

    it('sollte mutation-safe Kommentar-Kopie liefern', () => {
      const befehl = createTestBefehl();
      befehl.addKommentar(UserId.create().value! as UserId, 'Test', false);

      const kommentare1 = befehl.kommentare;
      const kommentare2 = befehl.kommentare;

      expect(kommentare1).not.toBe(kommentare2);
      expect(kommentare1).toHaveLength(kommentare2.length);
    });

    it('sollte undefined für optionale Felder zurückgeben wenn nicht gesetzt', () => {
      const befehl = createTestBefehl();

      expect(befehl.zeitvorgabe).toBeUndefined();
      expect(befehl.ereignis).toBeUndefined();
      expect(befehl.mittel).toBeUndefined();
      expect(befehl.ziel).toBeUndefined();
      expect(befehl.weg).toBeUndefined();
      expect(befehl.originalBefehlId).toBeUndefined();
    });
  });

  describe('Event Accumulation', () => {
    it('sollte Events über den gesamten Lifecycle akkumulieren', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();

      // markAlsZugestellt x2 → +2 BefehlZugestelltEvent + 1 BefehlStatusGeaendertEvent
      befehl.markAlsZugestellt(empfaengerIds[0]);
      befehl.markAlsZugestellt(empfaengerIds[1]);

      // quittieren x2 → +1 BefehlStatusGeaendertEvent (bei letztem)
      befehl.quittieren(empfaengerIds[0], 'VERSTANDEN');
      befehl.quittieren(empfaengerIds[1], 'VERSTANDEN');

      const events = befehl.getDomainEvents();
      // 2 Zugestellt + 1 StatusGeaendert(ZUGESTELLT) + 2 Quittiert + 1 StatusGeaendert(QUITTIERT)
      expect(events).toHaveLength(6);
      expect(events[0]).toBeInstanceOf(BefehlZugestelltEvent);
      expect(events[1]).toBeInstanceOf(BefehlZugestelltEvent);
      expect(events[2]).toBeInstanceOf(BefehlStatusGeaendertEvent);
      expect(events[3]).toBeInstanceOf(BefehlQuittiertEvent);
      expect(events[4]).toBeInstanceOf(BefehlQuittiertEvent);
      expect(events[5]).toBeInstanceOf(BefehlStatusGeaendertEvent);
    });

    it('sollte Events mit clearDomainEvents() leeren', () => {
      const befehl = createTestBefehl();
      expect(befehl.getDomainEvents()).toHaveLength(1);

      befehl.clearDomainEvents();

      expect(befehl.getDomainEvents()).toHaveLength(0);
    });

    it('sollte getDomainEvents() Shallow Copy liefern', () => {
      const befehl = createTestBefehl();
      const events1 = befehl.getDomainEvents();
      const events2 = befehl.getDomainEvents();

      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });
  });

  describe('State Machine - Vollständiger Lifecycle', () => {
    it('sollte den vollständigen Happy Path durchlaufen: ERTEILT → ZUGESTELLT → QUITTIERT', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      expect(befehl.status.value).toBe('ERTEILT');

      // Alle Empfänger zustellen → ZUGESTELLT
      for (const id of empfaengerIds) {
        befehl.markAlsZugestellt(id);
      }
      expect(befehl.status.value).toBe('ZUGESTELLT');

      // Alle Empfänger quittieren → QUITTIERT
      for (const id of empfaengerIds) {
        befehl.quittieren(id, 'VERSTANDEN');
      }
      expect(befehl.status.value).toBe('QUITTIERT');
    });

    it('sollte Korrektur-Workflow unterstützen: ERTEILT → KORRIGIERT', () => {
      const befehl = createTestBefehl();
      expect(befehl.status.value).toBe('ERTEILT');

      befehl.korrigieren();
      expect(befehl.status.value).toBe('KORRIGIERT');
    });

    it('sollte Korrektur nach Zustellung unterstützen: ZUGESTELLT → KORRIGIERT', () => {
      const { befehl, empfaengerIds } = createBefehlWithUserIds();
      for (const id of empfaengerIds) befehl.markAlsZugestellt(id);
      expect(befehl.status.value).toBe('ZUGESTELLT');

      befehl.korrigieren();
      expect(befehl.status.value).toBe('KORRIGIERT');
    });
  });

  describe('anonymisiere() - DSGVO Story 5.5', () => {
    it('sollte personenbezogene Daten irreversibel anonymisieren', () => {
      const befehl = createTestBefehl();
      const salt = 'test-salt-for-anonymisierung';

      const result = befehl.anonymisiere(salt);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.empfaengerCount).toBe(2);
      expect(result.value?.kommentarCount).toBe(0);

      // Befehlsgeber anonymisiert
      expect(befehl.befehlsgeberName).toMatch(/^\[ANON-[a-f0-9]{6}\]$/);
      expect(befehl.befehlsgeberId).toBeUndefined();
      expect(befehl.erstellerId).toBeUndefined();
      expect(befehl.anonymisiertAm).toBeInstanceOf(Date);

      // Empfaenger-Namen anonymisiert
      for (const e of befehl.empfaenger) {
        expect(e.name).toMatch(/^\[ANON-[a-f0-9]{6}\]$/);
        expect(e.empfaengerId).toBeUndefined();
      }
    });

    it('sollte Kommentar-AuthorIds entfernen (Review-Fix C1)', () => {
      const { befehl, erstellerId } = createBefehlWithUserIds();
      // Kommentar hinzufügen
      befehl.addKommentar(erstellerId, 'Test Kommentar', false);
      befehl.clearDomainEvents();

      const result = befehl.anonymisiere('salt-123');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.kommentarCount).toBe(1);
      // AuthorId muss entfernt sein
      for (const k of befehl.kommentare) {
        expect(k.authorId).toBeUndefined();
      }
    });

    it('sollte fehlschlagen wenn bereits anonymisiert', () => {
      const befehl = createTestBefehl();
      befehl.anonymisiere('salt-1');

      const result = befehl.anonymisiere('salt-2');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Befehl wurde bereits anonymisiert');
    });

    it('sollte fehlschlagen wenn gelöscht', () => {
      const befehl = createTestBefehl();
      // Erst anonymisieren, dann löschen
      befehl.anonymisiere('salt-1');
      befehl.markiereAlsGeloescht('admin');

      // Neuen Befehl erstellen und als gelöscht rekonstituieren
      const deletedBefehl = Befehl.reconstitute({
        id: BefehlId.create().value! as BefehlId,
        nummer: 'B2026-test1234',
        einsatzId: EinsatzId.create().value! as EinsatzId,
        auftrag: 'Test',
        befehlsgeberName: 'EL Test',
        befehlsgeberId: undefined,
        erstellerId: undefined,
        status: BefehlStatus.ERTEILT(),
        erteiltAm: new Date(),
        empfaenger: [],
        kommentare: [],
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: 'admin',
      });

      const result = deletedBefehl.anonymisiere('salt-3');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Gelöschte Befehle können nicht anonymisiert werden');
    });

    it('sollte deterministischen Hash mit gleichem Salt erzeugen', () => {
      const befehl1 = Befehl.create({
        einsatzId: EinsatzId.create().value! as EinsatzId,
        auftrag: 'Test',
        befehlsgeber: 'EL Müller',
        erstellerId: UserId.create().value! as UserId,
        empfaenger: [{ name: 'ZF Nord' }],
      }).value!;
      const befehl2 = Befehl.create({
        einsatzId: EinsatzId.create().value! as EinsatzId,
        auftrag: 'Test',
        befehlsgeber: 'EL Müller',
        erstellerId: UserId.create().value! as UserId,
        empfaenger: [{ name: 'ZF Nord' }],
      }).value!;

      befehl1.anonymisiere('same-salt');
      befehl2.anonymisiere('same-salt');

      // Gleicher Name + gleicher Salt = gleicher Hash
      expect(befehl1.befehlsgeberName).toBe(befehl2.befehlsgeberName);
    });

    it('sollte verschiedene Hashes mit verschiedenen Salts erzeugen', () => {
      const befehl1 = Befehl.create({
        einsatzId: EinsatzId.create().value! as EinsatzId,
        auftrag: 'Test',
        befehlsgeber: 'EL Müller',
        erstellerId: UserId.create().value! as UserId,
        empfaenger: [{ name: 'ZF Nord' }],
      }).value!;
      const befehl2 = Befehl.create({
        einsatzId: EinsatzId.create().value! as EinsatzId,
        auftrag: 'Test',
        befehlsgeber: 'EL Müller',
        erstellerId: UserId.create().value! as UserId,
        empfaenger: [{ name: 'ZF Nord' }],
      }).value!;

      befehl1.anonymisiere('salt-a');
      befehl2.anonymisiere('salt-b');

      // Verschiedene Salts = verschiedene Hashes
      expect(befehl1.befehlsgeberName).not.toBe(befehl2.befehlsgeberName);
    });

    it('sollte Sachinhalt (Auftrag, EAMZW) erhalten', () => {
      const befehl = Befehl.create({
        einsatzId: EinsatzId.create().value! as EinsatzId,
        auftrag: 'Sofort Wasser marsch',
        befehlsgeber: 'EL Müller',
        erstellerId: UserId.create().value! as UserId,
        empfaenger: [{ name: 'ZF Nord' }],
        zeitvorgabe: 'Sofort',
        mittel: '2 C-Rohre',
        ziel: 'Brandbekämpfung OG',
      }).value!;

      befehl.anonymisiere('salt-xyz');

      expect(befehl.auftrag).toBe('Sofort Wasser marsch');
      expect(befehl.zeitvorgabe).toBe('Sofort');
      expect(befehl.mittel).toBe('2 C-Rohre');
      expect(befehl.ziel).toBe('Brandbekämpfung OG');
      expect(befehl.status.value).toBe('ERTEILT');
    });
  });

  describe('markiereAlsGeloescht() - DSGVO Story 5.5', () => {
    it('sollte anonymisierten Befehl als gelöscht markieren', () => {
      const befehl = createTestBefehl();
      befehl.anonymisiere('salt-test');

      const result = befehl.markiereAlsGeloescht('admin-user-id');

      expect(result.isSuccess).toBe(true);
      expect(befehl.isDeleted).toBe(true);
      expect(befehl.deletedAt).toBeInstanceOf(Date);
      expect(befehl.deletedBy).toBe('admin-user-id');
    });

    it('sollte fehlschlagen wenn nicht anonymisiert', () => {
      const befehl = createTestBefehl();

      const result = befehl.markiereAlsGeloescht('admin');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Nur anonymisierte Befehle können gelöscht werden');
      expect(befehl.isDeleted).toBe(false);
    });

    it('sollte fehlschlagen wenn bereits gelöscht', () => {
      const befehl = createTestBefehl();
      befehl.anonymisiere('salt');
      befehl.markiereAlsGeloescht('admin');

      const result = befehl.markiereAlsGeloescht('admin');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Befehl ist bereits gelöscht');
    });
  });

  describe('Aggregate Root Integration', () => {
    it('sollte von AggregateRoot erben', () => {
      const befehl = createTestBefehl();

      expect(typeof befehl.getDomainEvents).toBe('function');
      expect(typeof befehl.clearDomainEvents).toBe('function');
      expect(typeof befehl.equals).toBe('function');
      expect(befehl.id).toBeInstanceOf(BefehlId);
      expect(befehl.createdAt).toBeInstanceOf(Date);
      expect(befehl.updatedAt).toBeInstanceOf(Date);
    });

    it('sollte Identity Equality basierend auf ID verwenden', () => {
      const befehl1 = createTestBefehl();
      const befehl2 = createTestBefehl();

      expect(befehl1.equals(befehl1)).toBe(true);
      expect(befehl1.equals(befehl2)).toBe(false);
    });

    it('sollte false bei null/undefined zurückgeben', () => {
      const befehl = createTestBefehl();
      // biome-ignore lint/suspicious/noExplicitAny: Test prüft null-safety
      expect(befehl.equals(undefined as any)).toBe(false);
      // biome-ignore lint/suspicious/noExplicitAny: Test prüft null-safety
      expect(befehl.equals(null as any)).toBe(false);
    });
  });
});
