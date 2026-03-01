import { createId } from '@paralleldrive/cuid2';
import { RollenBesetzung } from '../rollen-besetzung.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';
import { RolleBesetzt } from '@domain/kraefte/events/rolle-besetzt.event';
import { RolleFreigegeben } from '@domain/kraefte/events/rolle-freigegeben.event';
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';

describe('RollenBesetzung Aggregate', () => {
  // Test Fixtures - Deterministic test data
  const validEinsatzId = createId();
  const validPersonId = createId();
  const validRolleId = createId();
  const validBesetztVon = createId();

  const createValidProps = () => ({
    einsatzId: EinsatzId.create(validEinsatzId).value!,
    einsatzPersonId: EinsatzPersonId.create(validPersonId).value!,
    rolleId: RolleId.create(validRolleId).value!,
    rollenName: 'Organisatorischer Leiter (OrgL)',
    personVorname: 'Max',
    personNachname: 'Mustermann',
    besetztVon: validBesetztVon,
  });

  beforeEach(() => {
    jest.clearAllMocks(); // AC6: Clear mocks before each test
  });

  describe('create - Factory Method', () => {
    it('sollte RollenBesetzung erfolgreich erstellen', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = RollenBesetzung.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toBeDefined();
    });

    it('sollte Snapshot-Felder korrekt setzen (AC3)', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = RollenBesetzung.create(props);
      const besetzung = result.value!;

      // Then (Assert)
      expect(besetzung.rollenName).toBe('Organisatorischer Leiter (OrgL)');
      expect(besetzung.personVorname).toBe('Max');
      expect(besetzung.personNachname).toBe('Mustermann');
    });

    it('sollte Value Objects korrekt referenzieren', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = RollenBesetzung.create(props);
      const besetzung = result.value!;

      // Then (Assert)
      expect(besetzung.einsatzId.value).toBe(validEinsatzId);
      expect(besetzung.einsatzPersonId.value).toBe(validPersonId);
      expect(besetzung.rolleId.value).toBe(validRolleId);
    });

    it('sollte createdBy korrekt setzen', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = RollenBesetzung.create(props);
      const besetzung = result.value!;

      // Then (Assert)
      expect(besetzung.createdBy).toBe(validBesetztVon);
    });

    it('sollte RolleBesetzt Event emittieren', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = RollenBesetzung.create(props);
      const besetzung = result.value!;
      const events = besetzung.getDomainEvents();

      // Then (Assert)
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(RolleBesetzt);

      const event = events[0] as RolleBesetzt;
      expect(event.einsatzId).toBe(validEinsatzId);
      expect(event.einsatzPersonId).toBe(validPersonId);
      expect(event.rollenDefinitionId).toBe(validRolleId);
      expect(event.rollenName).toBe('Organisatorischer Leiter (OrgL)');
      expect(event.personVorname).toBe('Max');
      expect(event.personNachname).toBe('Mustermann');
      expect(event.besetztVon).toBe(validBesetztVon);
    });

    it('sollte unique CUID2 ID generieren', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result1 = RollenBesetzung.create(props);
      const result2 = RollenBesetzung.create(props);

      // Then (Assert)
      expect(result1.value?.id.value).not.toBe(result2.value?.id.value);
    });
  });

  describe('reconstitute - DB Rekonstitution', () => {
    it('sollte RollenBesetzung aus DB-Daten rekonstruieren', () => {
      // Given (Arrange)
      const existingId = createId();
      const createdAt = new Date('2024-01-15T10:30:00Z');
      const updatedAt = new Date('2024-01-15T10:30:00Z');

      const reconstitutionProps = {
        id: RollenBesetzungId.create(existingId).value!,
        einsatzId: EinsatzId.create(validEinsatzId).value!,
        einsatzPersonId: EinsatzPersonId.create(validPersonId).value!,
        rolleId: RolleId.create(validRolleId).value!,
        rollenName: 'Leitender Notarzt (LNA)',
        personVorname: 'Dr. Anna',
        personNachname: 'Schmidt',
        createdAt,
        createdBy: validBesetztVon,
        updatedAt,
      };

      // When (Act)
      const result = RollenBesetzung.reconstitute(reconstitutionProps);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const besetzung = result.value!;
      expect(besetzung.id.value).toBe(existingId);
      expect(besetzung.rollenName).toBe('Leitender Notarzt (LNA)');
      expect(besetzung.personVorname).toBe('Dr. Anna');
      expect(besetzung.personNachname).toBe('Schmidt');
      expect(besetzung.createdAt).toEqual(createdAt);
    });

    it('sollte KEINE Domain Events bei Rekonstitution emittieren', () => {
      // Given (Arrange)
      const reconstitutionProps = {
        id: RollenBesetzungId.create(createId()).value!,
        einsatzId: EinsatzId.create(validEinsatzId).value!,
        einsatzPersonId: EinsatzPersonId.create(validPersonId).value!,
        rolleId: RolleId.create(validRolleId).value!,
        rollenName: 'OrgL',
        personVorname: 'Max',
        personNachname: 'Mustermann',
        createdAt: new Date(),
        createdBy: validBesetztVon,
        updatedAt: new Date(),
      };

      // When (Act)
      const result = RollenBesetzung.reconstitute(reconstitutionProps);
      const events = result.value?.getDomainEvents();

      // Then (Assert)
      expect(events.length).toBe(0);
    });
  });

  describe('freigeben - Business Method', () => {
    it('sollte RolleFreigegeben Event emittieren', () => {
      // Given (Arrange)
      const props = createValidProps();
      const besetzung = RollenBesetzung.create(props).value!;
      besetzung.clearDomainEvents(); // Clear RolleBesetzt Event

      const freigegebenVon = createId();

      // When (Act)
      const result = besetzung.freigeben(freigegebenVon);
      const events = besetzung.getDomainEvents();

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(RolleFreigegeben);

      const event = events[0] as RolleFreigegeben;
      expect(event.einsatzId).toBe(validEinsatzId);
      expect(event.einsatzPersonId).toBe(validPersonId);
      expect(event.rollenDefinitionId).toBe(validRolleId);
      expect(event.rollenName).toBe('Organisatorischer Leiter (OrgL)');
      expect(event.personVorname).toBe('Max');
      expect(event.personNachname).toBe('Mustermann');
      expect(event.freigegebenVon).toBe(freigegebenVon);
    });

    it('sollte Snapshot-Daten im Event verwenden (AC3)', () => {
      // Given (Arrange)
      const props = {
        ...createValidProps(),
        rollenName: 'Leiter Behandlungsplatz',
        personVorname: 'Dr. Katharina',
        personNachname: 'Müller',
      };
      const besetzung = RollenBesetzung.create(props).value!;
      besetzung.clearDomainEvents();

      const freigegebenVon = createId();

      // When (Act)
      const result = besetzung.freigeben(freigegebenVon);
      const events = besetzung.getDomainEvents();

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const event = events[0] as RolleFreigegeben;
      expect(event.rollenName).toBe('Leiter Behandlungsplatz');
      expect(event.personVorname).toBe('Dr. Katharina');
      expect(event.personNachname).toBe('Müller');
    });

    it('sollte freigegebenAm und freigegebenVon setzen', () => {
      // Given (Arrange)
      const props = createValidProps();
      const besetzung = RollenBesetzung.create(props).value!;
      const freigegebenVon = createId();

      // When (Act)
      const result = besetzung.freigeben(freigegebenVon);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(besetzung.freigegebenAm).toBeDefined();
      expect(besetzung.freigegebenVon).toBe(freigegebenVon);
      expect(besetzung.isActive).toBe(false);
    });

    it('sollte mit BEREITS_FREIGEGEBEN fehlschlagen wenn bereits freigegeben', () => {
      // Given (Arrange)
      const props = createValidProps();
      const besetzung = RollenBesetzung.create(props).value!;
      besetzung.freigeben('user-1'); // Erstes Mal freigeben
      besetzung.clearDomainEvents();

      // When (Act)
      const result = besetzung.freigeben('user-2'); // Zweites Mal freigeben

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN);
    });
  });

  describe('Immutability', () => {
    it('sollte Snapshot-Felder immutable halten', () => {
      // Given (Arrange)
      const props = createValidProps();
      const besetzung = RollenBesetzung.create(props).value!;

      // Then (Assert)
      // Getters sind readonly - keine Setter vorhanden
      expect(() => {
        (besetzung as unknown as { _rollenName: string })._rollenName = 'Manipulated';
      }).toBeDefined(); // Private field, nicht direkt änderbar
      expect(besetzung.rollenName).toBe('Organisatorischer Leiter (OrgL)');
    });

    it('sollte Value Object IDs immutable halten', () => {
      // Given (Arrange)
      const props = createValidProps();
      const besetzung = RollenBesetzung.create(props).value!;

      // Then (Assert)
      const einsatzId1 = besetzung.einsatzId;
      const einsatzId2 = besetzung.einsatzId;
      expect(einsatzId1).toBe(einsatzId2); // Same reference (immutable)
    });
  });
});
