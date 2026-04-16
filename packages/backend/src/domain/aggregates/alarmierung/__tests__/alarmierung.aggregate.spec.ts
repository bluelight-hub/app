import { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import { AlarmierungEmpfaengerEntferntEvent } from '@domain/events/alarmierung-empfaenger-entfernt.event';
import { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import { AlarmierungZeitpunktFmsGesetztEvent } from '@domain/events/alarmierung-zeitpunkt-fms-gesetzt.event';
import { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import { NachalarmierungErstelltEvent } from '@domain/events/nachalarmierung-erstellt.event';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { AlarmierungEmpfaengerRef } from '../alarmierung-empfaenger-ref';
import type { AlarmierungEmpfaenger } from '../alarmierung-empfaenger.entity';
import type { CreateAlarmierungArgs, FuegeEmpfaengerHinzuArgs } from '../alarmierung.aggregate';
import { AlarmierungAggregate, mapFmsStatusZuZeitpunktFeld } from '../alarmierung.aggregate';

/**
 * Unit-Tests für das AlarmierungAggregate (Issue #408).
 *
 * Deckt alle Business-Methoden des Aggregat-Roots ab:
 * - Factory `create` inkl. sämtlicher Failure-Pfade
 * - Empfänger-Lifecycle (Hinzufügen, Entfernen, Duplikat-Erkennung)
 * - Manuelle Zeitpunkt-Korrektur mit Audit-Trail
 * - FMS-getriebene Auto-Population mit Status → Feld-Mapping
 * - Lifecycle-Übergang nach `abschliessen`
 * - Reaktionszeit-Getter und Event-Akkumulation
 */
describe('AlarmierungAggregate', () => {
  // ---------------------------------------------------------------------------
  // Test-Helpers
  // ---------------------------------------------------------------------------

  function createEinsatzId(): EinsatzId {
    const r = EinsatzId.create();
    if (r.isFailure) throw new Error(`Fixture-Fehler: ${r.error}`);
    return r.value as EinsatzId;
  }

  function baseArgs(override: Partial<CreateAlarmierungArgs> = {}): CreateAlarmierungArgs {
    return {
      einsatzId: createEinsatzId(),
      bezeichnung: 'Wohnungsbrand Musterstraße',
      createdBy: 'disponent-1',
      ...override,
    };
  }

  function createAggregate(override: Partial<CreateAlarmierungArgs> = {}): AlarmierungAggregate {
    const result = AlarmierungAggregate.create(baseArgs(override));
    if (result.isFailure) {
      throw new Error(`Fixture-Fehler: ${result.error}`);
    }
    return result.value as AlarmierungAggregate;
  }

  function fahrzeugRef(fahrzeugId = 'fzg-1'): AlarmierungEmpfaengerRef {
    return { kind: 'fahrzeug', fahrzeugId };
  }

  function personRef(personId = 'person-1'): AlarmierungEmpfaengerRef {
    return { kind: 'person', personId };
  }

  function einheitRef(einheitId = 'einheit-1'): AlarmierungEmpfaengerRef {
    return { kind: 'einheit', einheitId };
  }

  function empfaengerArgs(override: Partial<FuegeEmpfaengerHinzuArgs> = {}): FuegeEmpfaengerHinzuArgs {
    return {
      ref: fahrzeugRef(),
      nameSnapshot: 'HLF 20/1',
      createdBy: 'disponent-1',
      ...override,
    };
  }

  function addEmpfaenger(aggregate: AlarmierungAggregate, override: Partial<FuegeEmpfaengerHinzuArgs> = {}): AlarmierungEmpfaenger {
    const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs(override));
    if (result.isFailure) {
      throw new Error(`Fixture-Fehler: ${result.error}`);
    }
    return result.value as AlarmierungEmpfaenger;
  }

  // ---------------------------------------------------------------------------
  // Factory: create
  // ---------------------------------------------------------------------------

  describe('create()', () => {
    it('erzeugt ein Aggregat mit Default-Alarmierungszeit und emittiert AlarmierungErstelltEvent', () => {
      const einsatzId = createEinsatzId();
      const vorher = Date.now();

      const result = AlarmierungAggregate.create({
        einsatzId,
        bezeichnung: 'Verkehrsunfall B1',
        createdBy: 'dispo',
      });

      expect(result.isSuccess).toBe(true);
      const aggregate = result.value as AlarmierungAggregate;
      expect(aggregate.einsatzId).toBe(einsatzId);
      expect(aggregate.bezeichnung).toBe('Verkehrsunfall B1');
      expect(aggregate.beschreibung).toBeUndefined();
      expect(aggregate.status).toBe('aktiv');
      expect(aggregate.alarmierungszeit.getTime()).toBeGreaterThanOrEqual(vorher);
      expect(aggregate.istNachalarmierung).toBe(false);
      expect(aggregate.isAbgeschlossen()).toBe(false);
      expect(aggregate.empfaenger).toEqual([]);

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AlarmierungErstelltEvent);
    });

    it('trimmt Bezeichnung und setzt optionale Beschreibung (getrimmt)', () => {
      const aggregate = createAggregate({
        bezeichnung: '   Großbrand Lager   ',
        beschreibung: '  Starke Rauchentwicklung  ',
      });

      expect(aggregate.bezeichnung).toBe('Großbrand Lager');
      expect(aggregate.beschreibung).toBe('Starke Rauchentwicklung');
    });

    it('setzt Beschreibung auf undefined, wenn nur Whitespace übergeben wird', () => {
      const aggregate = createAggregate({ beschreibung: '    ' });

      expect(aggregate.beschreibung).toBeUndefined();
    });

    it('übernimmt explizit übergebene Alarmierungszeit', () => {
      const fix = new Date('2026-04-15T12:00:00.000Z');

      const aggregate = createAggregate({ alarmierungszeit: fix });

      expect(aggregate.alarmierungszeit).toBe(fix);
    });

    it('lehnt leere Bezeichnung ab', () => {
      const result = AlarmierungAggregate.create({
        einsatzId: createEinsatzId(),
        bezeichnung: '',
        createdBy: 'dispo',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Bezeichnung ist erforderlich');
    });

    it('lehnt Bezeichnung aus reinem Whitespace ab', () => {
      const result = AlarmierungAggregate.create({
        einsatzId: createEinsatzId(),
        bezeichnung: '   \t  ',
        createdBy: 'dispo',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Bezeichnung ist erforderlich');
    });

    it('lehnt fehlende EinsatzId ab', () => {
      const result = AlarmierungAggregate.create({
        einsatzId: undefined as unknown as EinsatzId,
        bezeichnung: 'Verkehrsunfall',
        createdBy: 'dispo',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('EinsatzId ist erforderlich');
    });

    it('lehnt leeren createdBy ab', () => {
      const result = AlarmierungAggregate.create({
        einsatzId: createEinsatzId(),
        bezeichnung: 'Verkehrsunfall',
        createdBy: '   ',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('createdBy ist erforderlich');
    });

    it('propagiert AlarmierungId.create() Failure als Result.fail', () => {
      // Simuliert CUID2-Generierungs-Fehler (praktisch unerreichbar, aber
      // der Code-Pfad wird durch Mocking abgedeckt).
      const spy = jest.spyOn(AlarmierungId, 'create').mockReturnValueOnce({
        isSuccess: false,
        isFailure: true,
        error: 'Invalid CUID format',
        value: undefined,
      } as unknown as ReturnType<typeof AlarmierungId.create>);

      const result = AlarmierungAggregate.create(baseArgs());

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid CUID format');
      spy.mockRestore();
    });

    it('emittiert bei Nachalarmierung zusätzlich NachalarmierungErstelltEvent', () => {
      const ursprungIdResult = AlarmierungId.create();
      const ursprungId = ursprungIdResult.value as AlarmierungId;

      const aggregate = createAggregate({ ursprungAlarmierungId: ursprungId });

      expect(aggregate.istNachalarmierung).toBe(true);
      expect(aggregate.ursprungAlarmierungId).toBe(ursprungId);

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(AlarmierungErstelltEvent);
      expect(events[1]).toBeInstanceOf(NachalarmierungErstelltEvent);
      const nachAlarmEvent = events[1] as NachalarmierungErstelltEvent;
      expect(nachAlarmEvent.data.ursprungAlarmierungId).toBe(ursprungId);
    });
  });

  // ---------------------------------------------------------------------------
  // reconstitute
  // ---------------------------------------------------------------------------

  describe('reconstitute()', () => {
    it('rekonstruiert das Aggregat ohne Events zu emittieren', () => {
      const original = createAggregate();
      original.clearDomainEvents();

      const rekonstruiert = AlarmierungAggregate.reconstitute(
        original.alarmierung,
        // Empfänger als leere Liste - Repository hätte sie selbst geladen.
        [],
      );

      expect(rekonstruiert.getDomainEvents()).toHaveLength(0);
      expect(rekonstruiert.id.equals(original.id)).toBe(true);
      expect(rekonstruiert.status).toBe('aktiv');
    });
  });

  // ---------------------------------------------------------------------------
  // fuegeEmpfaengerHinzu
  // ---------------------------------------------------------------------------

  describe('fuegeEmpfaengerHinzu()', () => {
    it('fügt einen Fahrzeug-Empfänger hinzu und emittiert EmpfaengerHinzugefuegtEvent', () => {
      const aggregate = createAggregate();

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs({ ref: fahrzeugRef('fzg-42'), nameSnapshot: 'HLF 20/1' }));

      expect(result.isSuccess).toBe(true);
      const empfaenger = result.value as AlarmierungEmpfaenger;
      expect(empfaenger.ref).toEqual({ kind: 'fahrzeug', fahrzeugId: 'fzg-42' });
      expect(empfaenger.nameSnapshot).toBe('HLF 20/1');
      expect(empfaenger.alarmiertAm).toBe(aggregate.alarmierungszeit);
      expect(aggregate.empfaenger).toHaveLength(1);

      const events = aggregate.getDomainEvents();
      expect(events[events.length - 1]).toBeInstanceOf(AlarmierungEmpfaengerHinzugefuegtEvent);
    });

    it('trimmt den nameSnapshot', () => {
      const aggregate = createAggregate();

      const empfaenger = addEmpfaenger(aggregate, { nameSnapshot: '  LF 10  ' });

      expect(empfaenger.nameSnapshot).toBe('LF 10');
    });

    it('übernimmt explizites alarmiertAm statt Default-Alarmierungszeit', () => {
      const aggregate = createAggregate();
      const spezifischerZeitpunkt = new Date(aggregate.alarmierungszeit.getTime() + 60_000);

      const empfaenger = addEmpfaenger(aggregate, { alarmiertAm: spezifischerZeitpunkt });

      expect(empfaenger.alarmiertAm).toBe(spezifischerZeitpunkt);
    });

    it('erkennt Duplikate bei Fahrzeug-Empfängern', () => {
      const aggregate = createAggregate();
      addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-1') });

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs({ ref: fahrzeugRef('fzg-1'), nameSnapshot: 'Andere Bezeichnung' }));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Empfänger ist dieser Alarmierung bereits zugeordnet');
      expect(aggregate.empfaenger).toHaveLength(1);
    });

    it('erkennt Duplikate bei Personen-Empfängern', () => {
      const aggregate = createAggregate();
      addEmpfaenger(aggregate, { ref: personRef('person-x'), nameSnapshot: 'Max Mustermann' });

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs({ ref: personRef('person-x'), nameSnapshot: 'Max M.' }));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Empfänger ist dieser Alarmierung bereits zugeordnet');
    });

    it('erkennt Duplikate bei Einheit-Empfängern', () => {
      const aggregate = createAggregate();
      addEmpfaenger(aggregate, { ref: einheitRef('einheit-a'), nameSnapshot: 'Zug 1' });

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs({ ref: einheitRef('einheit-a'), nameSnapshot: 'Zug 1 (alt)' }));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Empfänger ist dieser Alarmierung bereits zugeordnet');
    });

    it('erlaubt unterschiedliche Typen mit identischer ID-Struktur nebeneinander', () => {
      const aggregate = createAggregate();
      addEmpfaenger(aggregate, { ref: fahrzeugRef('shared-id'), nameSnapshot: 'HLF' });

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs({ ref: personRef('shared-id'), nameSnapshot: 'Max' }));

      expect(result.isSuccess).toBe(true);
      expect(aggregate.empfaenger).toHaveLength(2);
    });

    it('lehnt invaliden empfaengerRef (leere fahrzeugId) ab', () => {
      const aggregate = createAggregate();
      const invalidRef = { kind: 'fahrzeug', fahrzeugId: '' } as unknown as AlarmierungEmpfaengerRef;

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs({ ref: invalidRef }));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('fahrzeugId ist erforderlich');
    });

    it('lehnt leeren nameSnapshot ab', () => {
      const aggregate = createAggregate();

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs({ nameSnapshot: '   ' }));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('nameSnapshot ist erforderlich');
    });

    it('lehnt leeren createdBy ab', () => {
      const aggregate = createAggregate();

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs({ createdBy: '   ' }));

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('createdBy ist erforderlich');
    });

    it('propagiert AlarmierungEmpfaengerId.create() Failure', () => {
      const aggregate = createAggregate();
      const spy = jest.spyOn(AlarmierungEmpfaengerId, 'create').mockReturnValueOnce({
        isSuccess: false,
        isFailure: true,
        error: 'Invalid CUID format',
        value: undefined,
      } as unknown as ReturnType<typeof AlarmierungEmpfaengerId.create>);

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs());

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid CUID format');
      spy.mockRestore();
    });

    it('verweigert weitere Empfänger, wenn die Alarmierung abgeschlossen ist', () => {
      const aggregate = createAggregate();
      aggregate.abschliessen('leiter-1');

      const result = aggregate.fuegeEmpfaengerHinzu(empfaengerArgs());

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Abgeschlossene Alarmierung kann keine weiteren Empfänger aufnehmen');
    });
  });

  // ---------------------------------------------------------------------------
  // entferneEmpfaenger
  // ---------------------------------------------------------------------------

  describe('entferneEmpfaenger()', () => {
    it('entfernt einen existierenden Empfänger und emittiert Entfernt-Event', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);

      const result = aggregate.entferneEmpfaenger(empfaenger.id, 'dispo');

      expect(result.isSuccess).toBe(true);
      expect(aggregate.empfaenger).toHaveLength(0);

      const events = aggregate.getDomainEvents();
      const lastEvent = events[events.length - 1];
      expect(lastEvent).toBeInstanceOf(AlarmierungEmpfaengerEntferntEvent);
      const entferntEvent = lastEvent as AlarmierungEmpfaengerEntferntEvent;
      expect(entferntEvent.data.empfaengerId.equals(empfaenger.id)).toBe(true);
      expect(entferntEvent.data.nameSnapshot).toBe(empfaenger.nameSnapshot);
    });

    it('meldet Fehler, wenn der Empfänger nicht gefunden wird', () => {
      const aggregate = createAggregate();
      const fremdeIdResult = AlarmierungEmpfaengerId.create();
      const fremdeId = fremdeIdResult.value as AlarmierungEmpfaengerId;

      const result = aggregate.entferneEmpfaenger(fremdeId, 'dispo');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Empfänger nicht gefunden');
    });

    it('verweigert Entfernung nach Abschluss der Alarmierung', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      aggregate.abschliessen('leiter-1');

      const result = aggregate.entferneEmpfaenger(empfaenger.id, 'dispo');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Abgeschlossene Alarmierung kann nicht geändert werden');
    });
  });

  // ---------------------------------------------------------------------------
  // korrigiereZeitpunkt
  // ---------------------------------------------------------------------------

  describe('korrigiereZeitpunkt()', () => {
    it('setzt einen bisher leeren Zeitpunkt und emittiert Korrigiert-Event mit alterWert=null', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      const vorOrt = new Date(empfaenger.alarmiertAm.getTime() + 5 * 60_000);

      const result = aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', vorOrt, 'dispo');

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.vorOrtAm).toBe(vorOrt);

      const events = aggregate.getDomainEvents();
      const lastEvent = events[events.length - 1] as AlarmierungZeitpunktKorrigiertEvent;
      expect(lastEvent).toBeInstanceOf(AlarmierungZeitpunktKorrigiertEvent);
      expect(lastEvent.data.feld).toBe('vorOrtAm');
      expect(lastEvent.data.alterWert).toBeNull();
      expect(lastEvent.data.neuerWert).toBe(vorOrt);
      expect(lastEvent.data.korrigiertVon).toBe('dispo');
    });

    it('überschreibt einen bestehenden Zeitpunkt und protokolliert alten und neuen Wert', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      const alt = new Date(empfaenger.alarmiertAm.getTime() + 60_000);
      const neu = new Date(empfaenger.alarmiertAm.getTime() + 120_000);
      aggregate.korrigiereZeitpunkt(empfaenger.id, 'ausgeruecktAm', alt, 'dispo');

      const result = aggregate.korrigiereZeitpunkt(empfaenger.id, 'ausgeruecktAm', neu, 'dispo-2');

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.ausgeruecktAm).toBe(neu);

      const events = aggregate.getDomainEvents();
      const lastEvent = events[events.length - 1] as AlarmierungZeitpunktKorrigiertEvent;
      expect(lastEvent.data.alterWert).toBe(alt);
      expect(lastEvent.data.neuerWert).toBe(neu);
      expect(lastEvent.data.korrigiertVon).toBe('dispo-2');
    });

    it('setzt einen Zeitpunkt auf null zurück (Reset-Pfad)', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      const gesetzt = new Date(empfaenger.alarmiertAm.getTime() + 60_000);
      aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', gesetzt, 'dispo');

      const result = aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', null, 'dispo');

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.vorOrtAm).toBeNull();

      const events = aggregate.getDomainEvents();
      const lastEvent = events[events.length - 1] as AlarmierungZeitpunktKorrigiertEvent;
      expect(lastEvent.data.alterWert).toBe(gesetzt);
      expect(lastEvent.data.neuerWert).toBeNull();
    });

    it('ist idempotent: identischer Zeitpunkt emittiert kein Event', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      const zeitpunkt = new Date(empfaenger.alarmiertAm.getTime() + 60_000);
      aggregate.korrigiereZeitpunkt(empfaenger.id, 'ausgeruecktAm', zeitpunkt, 'dispo');
      const eventsVorher = aggregate.getDomainEvents().length;

      const result = aggregate.korrigiereZeitpunkt(empfaenger.id, 'ausgeruecktAm', new Date(zeitpunkt.getTime()), 'dispo');

      expect(result.isSuccess).toBe(true);
      expect(aggregate.getDomainEvents()).toHaveLength(eventsVorher);
    });

    it('ist idempotent: wiederholtes Zurücksetzen auf null emittiert kein Event', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      const eventsVorher = aggregate.getDomainEvents().length;

      const result = aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', null, 'dispo');

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.vorOrtAm).toBeNull();
      expect(aggregate.getDomainEvents()).toHaveLength(eventsVorher);
    });

    it('lehnt neuen Wert ab, wenn er vor alarmiertAm liegt', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      const davor = new Date(empfaenger.alarmiertAm.getTime() - 1_000);

      const result = aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', davor, 'dispo');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('vorOrtAm darf nicht vor alarmiertAm liegen');
      expect(empfaenger.vorOrtAm).toBeNull();
    });

    it('meldet Fehler, wenn der Empfänger nicht existiert', () => {
      const aggregate = createAggregate();
      const fremdeId = AlarmierungEmpfaengerId.create().value as AlarmierungEmpfaengerId;

      const result = aggregate.korrigiereZeitpunkt(fremdeId, 'vorOrtAm', new Date(), 'dispo');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Empfänger nicht gefunden');
    });

    it('lehnt leeren updatedBy ab', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);

      const result = aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', new Date(empfaenger.alarmiertAm.getTime() + 1_000), '   ');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('updatedBy ist erforderlich');
    });

    it('verweigert Korrektur nach Abschluss der Alarmierung', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      aggregate.abschliessen('leiter-1');

      const result = aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', new Date(empfaenger.alarmiertAm.getTime() + 60_000), 'dispo');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Abgeschlossene Alarmierung kann nicht geändert werden');
    });
  });

  // ---------------------------------------------------------------------------
  // aktualisiereZeitpunktAusFms
  // ---------------------------------------------------------------------------

  describe('aktualisiereZeitpunktAusFms()', () => {
    it('ist No-op, wenn kein Empfänger zum Fahrzeug passt (z.B. nur Person/Einheit im Aggregat)', () => {
      const aggregate = createAggregate();
      addEmpfaenger(aggregate, { ref: personRef('p-1'), nameSnapshot: 'Max' });
      addEmpfaenger(aggregate, { ref: einheitRef('e-1'), nameSnapshot: 'Zug 1' });
      const eventsVorher = aggregate.getDomainEvents().length;

      const result = aggregate.aktualisiereZeitpunktAusFms('fzg-unbekannt', 4, new Date());

      expect(result.isSuccess).toBe(true);
      expect(aggregate.getDomainEvents()).toHaveLength(eventsVorher);
    });

    it('ist No-op, wenn die Alarmierung abgeschlossen ist', () => {
      const aggregate = createAggregate();
      addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-1') });
      aggregate.abschliessen('leiter-1');
      const eventsVorher = aggregate.getDomainEvents().length;

      const result = aggregate.aktualisiereZeitpunktAusFms('fzg-1', 4, new Date());

      expect(result.isSuccess).toBe(true);
      expect(aggregate.getDomainEvents()).toHaveLength(eventsVorher);
    });

    it('Status 3 setzt ausgeruecktAm und emittiert FmsGesetzt-Event', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-1') });
      const zeitpunkt = new Date(empfaenger.alarmiertAm.getTime() + 30_000);

      const result = aggregate.aktualisiereZeitpunktAusFms('fzg-1', 3, zeitpunkt);

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.ausgeruecktAm).toBe(zeitpunkt);
      expect(empfaenger.letzterFmsStatus).toBe(3);

      const events = aggregate.getDomainEvents();
      const lastEvent = events[events.length - 1] as AlarmierungZeitpunktFmsGesetztEvent;
      expect(lastEvent).toBeInstanceOf(AlarmierungZeitpunktFmsGesetztEvent);
      expect(lastEvent.data.feld).toBe('ausgeruecktAm');
      expect(lastEvent.data.fmsStatus).toBe(3);
      expect(lastEvent.data.wert).toBe(zeitpunkt);
    });

    it('Status 4 setzt vorOrtAm', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-2') });
      const zeitpunkt = new Date(empfaenger.alarmiertAm.getTime() + 60_000);

      aggregate.aktualisiereZeitpunktAusFms('fzg-2', 4, zeitpunkt);

      expect(empfaenger.vorOrtAm).toBe(zeitpunkt);
      expect(empfaenger.letzterFmsStatus).toBe(4);
    });

    it('Status 1 setzt wiederFreiAm', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-3') });
      const zeitpunkt = new Date(empfaenger.alarmiertAm.getTime() + 90_000);

      aggregate.aktualisiereZeitpunktAusFms('fzg-3', 1, zeitpunkt);

      expect(empfaenger.wiederFreiAm).toBe(zeitpunkt);
      expect(empfaenger.letzterFmsStatus).toBe(1);
    });

    it('Status 2 setzt ebenfalls wiederFreiAm', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-4') });
      const zeitpunkt = new Date(empfaenger.alarmiertAm.getTime() + 120_000);

      aggregate.aktualisiereZeitpunktAusFms('fzg-4', 2, zeitpunkt);

      expect(empfaenger.wiederFreiAm).toBe(zeitpunkt);
      expect(empfaenger.letzterFmsStatus).toBe(2);
    });

    it('unbekannter Status setzt nur letzterFmsStatus und emittiert kein Event', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-5') });
      const eventsVorher = aggregate.getDomainEvents().length;

      const result = aggregate.aktualisiereZeitpunktAusFms('fzg-5', 6, new Date(empfaenger.alarmiertAm.getTime() + 10_000));

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.letzterFmsStatus).toBe(6);
      expect(empfaenger.ausgeruecktAm).toBeNull();
      expect(empfaenger.vorOrtAm).toBeNull();
      expect(empfaenger.wiederFreiAm).toBeNull();
      expect(aggregate.getDomainEvents()).toHaveLength(eventsVorher);
    });

    it('überschreibt einen bereits gesetzten (manuellen) Zeitpunkt NICHT', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-6') });
      const manuell = new Date(empfaenger.alarmiertAm.getTime() + 30_000);
      aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', manuell, 'dispo');
      const eventsVorher = aggregate.getDomainEvents().length;

      const fmsZeitpunkt = new Date(empfaenger.alarmiertAm.getTime() + 60_000);
      const result = aggregate.aktualisiereZeitpunktAusFms('fzg-6', 4, fmsZeitpunkt);

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.vorOrtAm).toBe(manuell);
      expect(empfaenger.letzterFmsStatus).toBe(4);
      // Kein FmsGesetzt-Event, da Feld bereits gesetzt war.
      expect(aggregate.getDomainEvents()).toHaveLength(eventsVorher);
    });

    it('verwirft FMS-Zeitpunkte, die vor alarmiertAm liegen (No-op für das Feld)', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-7') });
      const zuFrueh = new Date(empfaenger.alarmiertAm.getTime() - 1_000);

      const result = aggregate.aktualisiereZeitpunktAusFms('fzg-7', 4, zuFrueh);

      expect(result.isSuccess).toBe(true);
      expect(empfaenger.vorOrtAm).toBeNull();
      expect(empfaenger.letzterFmsStatus).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // mapFmsStatusZuZeitpunktFeld
  // ---------------------------------------------------------------------------

  describe('mapFmsStatusZuZeitpunktFeld()', () => {
    it.each([
      [1, 'wiederFreiAm'],
      [2, 'wiederFreiAm'],
      [3, 'ausgeruecktAm'],
      [4, 'vorOrtAm'],
    ] as const)('Status %i → %s', (status, expected) => {
      expect(mapFmsStatusZuZeitpunktFeld(status)).toBe(expected);
    });

    it('gibt undefined für unbekannte Stati zurück', () => {
      expect(mapFmsStatusZuZeitpunktFeld(6)).toBeUndefined();
      expect(mapFmsStatusZuZeitpunktFeld(0)).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // abschliessen
  // ---------------------------------------------------------------------------

  describe('abschliessen()', () => {
    it('überführt den Status auf abgeschlossen und emittiert Abgeschlossen-Event', () => {
      const aggregate = createAggregate();

      const result = aggregate.abschliessen('leiter-1');

      expect(result.isSuccess).toBe(true);
      expect(aggregate.status).toBe('abgeschlossen');
      expect(aggregate.isAbgeschlossen()).toBe(true);

      const events = aggregate.getDomainEvents();
      const lastEvent = events[events.length - 1] as AlarmierungAbgeschlossenEvent;
      expect(lastEvent).toBeInstanceOf(AlarmierungAbgeschlossenEvent);
      expect(lastEvent.abgeschlossenVon).toBe('leiter-1');
    });

    it('schlägt fehl, wenn bereits abgeschlossen', () => {
      const aggregate = createAggregate();
      aggregate.abschliessen('leiter-1');

      const result = aggregate.abschliessen('leiter-2');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Alarmierung ist bereits abgeschlossen');
    });

    it('lehnt leeren updatedBy ab', () => {
      const aggregate = createAggregate();

      const result = aggregate.abschliessen('  ');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('updatedBy ist erforderlich');
    });
  });

  // ---------------------------------------------------------------------------
  // reaktionszeitSekunden (Getter auf dem Empfaenger-Child)
  // ---------------------------------------------------------------------------

  describe('reaktionszeitSekunden (Empfänger-Getter)', () => {
    it('ist null, solange vorOrtAm nicht gesetzt ist', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);

      expect(empfaenger.reaktionszeitSekunden).toBeNull();
    });

    it('berechnet Differenz zwischen alarmiertAm und vorOrtAm in Sekunden', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);
      const vorOrt = new Date(empfaenger.alarmiertAm.getTime() + 8 * 60_000 + 500); // 8min 500ms

      aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', vorOrt, 'dispo');

      expect(empfaenger.reaktionszeitSekunden).toBe(480); // Floor auf ganze Sekunden
    });

    it('liefert 0 wenn vorOrtAm exakt auf alarmiertAm liegt', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate);

      aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', empfaenger.alarmiertAm, 'dispo');

      expect(empfaenger.reaktionszeitSekunden).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Event-Akkumulation (Plan-Punkt: getDomainEvents())
  // ---------------------------------------------------------------------------

  describe('Event-Akkumulation (getDomainEvents)', () => {
    it('akkumuliert alle Lifecycle-Events in der Reihenfolge ihres Auftretens', () => {
      const aggregate = createAggregate();
      const empfaenger = addEmpfaenger(aggregate, { ref: fahrzeugRef('fzg-1') });
      aggregate.korrigiereZeitpunkt(empfaenger.id, 'ausgeruecktAm', new Date(empfaenger.alarmiertAm.getTime() + 60_000), 'dispo');
      aggregate.aktualisiereZeitpunktAusFms('fzg-1', 4, new Date(empfaenger.alarmiertAm.getTime() + 120_000));
      aggregate.entferneEmpfaenger(empfaenger.id, 'dispo');
      aggregate.abschliessen('leiter-1');

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(6);
      expect(events[0]).toBeInstanceOf(AlarmierungErstelltEvent);
      expect(events[1]).toBeInstanceOf(AlarmierungEmpfaengerHinzugefuegtEvent);
      expect(events[2]).toBeInstanceOf(AlarmierungZeitpunktKorrigiertEvent);
      expect(events[3]).toBeInstanceOf(AlarmierungZeitpunktFmsGesetztEvent);
      expect(events[4]).toBeInstanceOf(AlarmierungEmpfaengerEntferntEvent);
      expect(events[5]).toBeInstanceOf(AlarmierungAbgeschlossenEvent);
    });

    it('liefert eine Shallow-Copy (Mutation der Rückgabe beeinflusst Aggregat nicht)', () => {
      const aggregate = createAggregate();
      const vorher = aggregate.getDomainEvents().length;

      const events = aggregate.getDomainEvents();
      events.pop();

      expect(aggregate.getDomainEvents()).toHaveLength(vorher);
    });

    it('clearDomainEvents() leert die Akkumulator-Liste', () => {
      const aggregate = createAggregate();
      addEmpfaenger(aggregate);
      expect(aggregate.getDomainEvents().length).toBeGreaterThan(0);

      aggregate.clearDomainEvents();

      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });
  });
});
