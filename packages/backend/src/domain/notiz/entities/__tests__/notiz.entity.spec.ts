// @ts-nocheck
import { Notiz } from '../notiz.entity';
import { NotizErstelltEvent } from '@domain/notiz/events/notiz-erstellt.event';
import { NotizAktualisiertEvent } from '@domain/notiz/events/notiz-aktualisiert.event';
import { NotizGeloeschtEvent } from '@domain/notiz/events/notiz-geloescht.event';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { NotizTitel } from '@domain/notiz/value-objects/notiz-titel';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Unit Tests für Notiz Entity (Aggregate Root).
 *
 * Testet die Factory Methods und Business Rules gemaess AAA Pattern
 * mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - create(): Erfolgreiche Erstellung + Event Emission
 * - create(): Validierungsfehler (Titel, Inhalt, Kategorie)
 * - create(): Whitespace Trimming
 * - create(): istTeamsichtbar Default und explizite Werte
 * - reconstruct(): Rekonstruktion aus DB ohne Events
 * - reconstruct(): Deleted State
 * - reconstruct(): Null optionale Felder
 * - reconstruct(): istTeamsichtbar Rekonstruktion
 * - Identity Equality Tests
 * - update(): istTeamsichtbar Aenderungen
 */
describe('Notiz Entity', () => {
  /**
   * Generiert eine gültige UserId für Tests.
   */
  const generateValidUserId = () => UserId.create().value!;

  describe('create()', () => {
    it('should create notiz successfully with all fields', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const props = {
        einsatzId: 'einsatz-123',
        titel: 'Wichtige Beobachtung',
        inhalt: 'Rauchentwicklung im Nordosten beobachtet',
        kategorie: 'Lage',
        erstelltVon,
      };

      // When (Act)
      const result = Notiz.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();

      const notiz = result.value!;
      expect(notiz.id).toBeDefined();
      expect(notiz.einsatzId).toBe('einsatz-123');
      expect(notiz.titel.value).toBe('Wichtige Beobachtung');
      expect(notiz.inhalt).toBe('Rauchentwicklung im Nordosten beobachtet');
      expect(notiz.kategorie).toBe('Lage');
      expect(notiz.erstelltVon.equals(erstelltVon)).toBe(true);
      expect(notiz.istTeamsichtbar).toBe(false);
      expect(notiz.isDeleted).toBe(false);
      expect(notiz.deletedAt).toBeNull();
      expect(notiz.deletedBy).toBeNull();
      expect(notiz.createdAt).toBeInstanceOf(Date);
      expect(notiz.updatedAt).toBeInstanceOf(Date);
    });

    it('should create notiz without optional fields (inhalt, kategorie)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: 'einsatz-456',
        titel: 'Kurze Notiz',
        erstelltVon: generateValidUserId(),
      };

      // When (Act)
      const result = Notiz.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.inhalt).toBeNull();
      expect(result.value?.kategorie).toBeNull();
    });

    it('should create notiz with istTeamsichtbar=false by default', () => {
      // Given (Arrange)
      const props = {
        einsatzId: 'einsatz-123',
        titel: 'Notiz ohne Teamsichtbarkeit',
        erstelltVon: generateValidUserId(),
      };

      // When (Act)
      const result = Notiz.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.istTeamsichtbar).toBe(false);
    });

    it('should create notiz with istTeamsichtbar=true when specified', () => {
      // Given (Arrange)
      const props = {
        einsatzId: 'einsatz-123',
        titel: 'Teamsichtbare Notiz',
        istTeamsichtbar: true,
        erstelltVon: generateValidUserId(),
      };

      // When (Act)
      const result = Notiz.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.istTeamsichtbar).toBe(true);
    });

    it('should emit NotizErstelltEvent on create', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const props = {
        einsatzId: 'einsatz-789',
        titel: 'Lagenotiz',
        erstelltVon,
      };

      // When (Act)
      const result = Notiz.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const notiz = result.value!;

      const events = notiz.getDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(NotizErstelltEvent);

      const event = events[0] as NotizErstelltEvent;
      expect(event.notizId.toString()).toBe(notiz.id.toString());
      expect(event.einsatzId).toBe('einsatz-789');
      expect(event.titel).toBe('Lagenotiz');
      expect(event.erstelltVon.equals(erstelltVon)).toBe(true);
    });

    it('should fail when titel is empty', () => {
      // Given & When (Arrange & Act)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: '',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_TITEL_REQUIRED');
    });

    it('should fail when titel is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: '   ',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_TITEL_REQUIRED');
    });

    it('should fail when titel exceeds max length', () => {
      // Given & When (Arrange & Act)
      const tooLongTitel = 'A'.repeat(101);
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: tooLongTitel,
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_TITEL_TOO_LONG');
    });

    it('should accept titel with exactly 100 characters', () => {
      // Given & When (Arrange & Act)
      const maxTitel = 'A'.repeat(100);
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: maxTitel,
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.titel.value).toBe(maxTitel);
    });

    it('should fail when inhalt exceeds max length', () => {
      // Given & When (Arrange & Act)
      const tooLongInhalt = 'B'.repeat(2001);
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Test Notiz',
        inhalt: tooLongInhalt,
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_INHALT_TOO_LONG');
    });

    it('should accept inhalt with exactly 2000 characters', () => {
      // Given & When (Arrange & Act)
      const maxInhalt = 'B'.repeat(2000);
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Test Notiz',
        inhalt: maxInhalt,
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.inhalt).toBe(maxInhalt);
    });

    it('should fail when kategorie exceeds max length', () => {
      // Given & When (Arrange & Act)
      const tooLongKategorie = 'K'.repeat(51);
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Test Notiz',
        kategorie: tooLongKategorie,
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_KATEGORIE_TOO_LONG');
    });

    it('should accept kategorie with exactly 50 characters', () => {
      // Given & When (Arrange & Act)
      const maxKategorie = 'K'.repeat(50);
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Test Notiz',
        kategorie: maxKategorie,
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorie).toBe(maxKategorie);
    });

    it('should trim titel whitespace', () => {
      // Given & When (Arrange & Act)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: '  Lagenotiz  ',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.titel.value).toBe('Lagenotiz');
    });

    it('should trim inhalt whitespace', () => {
      // Given & When (Arrange & Act)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Test Notiz',
        inhalt: '  Inhalt mit Leerzeichen  ',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.inhalt).toBe('Inhalt mit Leerzeichen');
    });

    it('should trim kategorie whitespace', () => {
      // Given & When (Arrange & Act)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Test Notiz',
        kategorie: '  Lage  ',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorie).toBe('Lage');
    });

    it('should treat whitespace-only inhalt as null', () => {
      // Given & When (Arrange & Act)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Test Notiz',
        inhalt: '   ',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.inhalt).toBeNull();
    });

    it('should treat whitespace-only kategorie as null', () => {
      // Given & When (Arrange & Act)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Test Notiz',
        kategorie: '   ',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorie).toBeNull();
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct entity without emitting events', () => {
      // Given (Arrange)
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Lagenotiz').value!;
      const erstelltVon = generateValidUserId();
      const createdAt = new Date('2026-02-03T10:00:00.000Z');
      const updatedAt = new Date('2026-02-03T10:30:00.000Z');

      // When (Act)
      const notiz = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: 'Rauchentwicklung beobachtet',
        kategorie: 'Lage',
        istTeamsichtbar: false,
        erstelltVon,
        createdAt,
        updatedAt,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(notiz).toBeDefined();
      expect(notiz.id.equals(id)).toBe(true);
      expect(notiz.einsatzId).toBe('einsatz-123');
      expect(notiz.titel.value).toBe('Lagenotiz');
      expect(notiz.inhalt).toBe('Rauchentwicklung beobachtet');
      expect(notiz.kategorie).toBe('Lage');
      expect(notiz.erstelltVon.equals(erstelltVon)).toBe(true);
      expect(notiz.createdAt).toEqual(createdAt);
      expect(notiz.updatedAt).toEqual(updatedAt);
      expect(notiz.isDeleted).toBe(false);
      expect(notiz.deletedAt).toBeNull();
      expect(notiz.deletedBy).toBeNull();

      // CRITICAL: reconstruct() darf KEINE Domain Events emittieren
      const events = notiz.getDomainEvents();
      expect(events.length).toBe(0);
    });

    it('should reconstruct deleted entity correctly', () => {
      // Given (Arrange)
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Gelöschte Notiz').value!;
      const erstelltVon = generateValidUserId();
      const deletedBy = generateValidUserId();
      const deletedAt = new Date('2026-02-03T12:00:00.000Z');

      // When (Act)
      const notiz = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: null,
        kategorie: null,
        istTeamsichtbar: false,
        erstelltVon,
        createdAt: new Date('2026-02-03T10:00:00.000Z'),
        updatedAt: new Date('2026-02-03T12:00:00.000Z'),
        isDeleted: true,
        deletedAt,
        deletedBy,
      });

      // Then (Assert)
      expect(notiz.isDeleted).toBe(true);
      expect(notiz.deletedAt).toEqual(deletedAt);
      expect(notiz.deletedBy?.equals(deletedBy)).toBe(true);

      // CRITICAL: reconstruct() darf KEINE Domain Events emittieren
      expect(notiz.getDomainEvents().length).toBe(0);
    });

    it('should reconstruct entity with null optional fields', () => {
      // Given (Arrange)
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Ohne Optionale Felder').value!;

      // When (Act)
      const notiz = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: null,
        kategorie: null,
        istTeamsichtbar: false,
        erstelltVon: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(notiz.inhalt).toBeNull();
      expect(notiz.kategorie).toBeNull();
    });

    it('should reconstruct entity with istTeamsichtbar=true', () => {
      // Given (Arrange)
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Teamsichtbare Notiz').value!;

      // When (Act)
      const notiz = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: 'Sichtbar für das Team',
        kategorie: 'Lage',
        istTeamsichtbar: true,
        erstelltVon: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(notiz.istTeamsichtbar).toBe(true);
    });
  });

  describe('Identity Equality', () => {
    it('should be equal when IDs match', () => {
      // Given (Arrange)
      const id = NotizId.create().value! as NotizId;
      const titel1 = NotizTitel.create('Notiz A').value!;
      const titel2 = NotizTitel.create('Notiz B').value!;

      // When (Act)
      const notiz1 = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel: titel1,
        inhalt: null,
        kategorie: null,
        istTeamsichtbar: false,
        erstelltVon: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      const notiz2 = Notiz.reconstruct({
        id, // gleiche ID
        einsatzId: 'einsatz-456', // anderer Einsatz
        titel: titel2, // anderer Titel
        inhalt: 'Anderer Inhalt',
        kategorie: 'Andere Kategorie',
        istTeamsichtbar: false,
        erstelltVon: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(notiz1.equals(notiz2)).toBe(true);
    });

    it('should not be equal when IDs differ', () => {
      // Given (Arrange)
      const titel = NotizTitel.create('Gleicher Titel').value!;
      const erstelltVon = generateValidUserId();

      // When (Act)
      const notiz1 = Notiz.reconstruct({
        id: NotizId.create().value! as NotizId,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: null,
        kategorie: null,
        istTeamsichtbar: false,
        erstelltVon,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      const notiz2 = Notiz.reconstruct({
        id: NotizId.create().value! as NotizId, // andere ID
        einsatzId: 'einsatz-123',
        titel,
        inhalt: null,
        kategorie: null,
        istTeamsichtbar: false,
        erstelltVon,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(notiz1.equals(notiz2)).toBe(false);
    });
  });

  describe('update()', () => {
    /**
     * Erstellt eine gültige Notiz für Update-Tests.
     */
    const createValidNotiz = () => {
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Original Titel',
        inhalt: 'Originaler Inhalt',
        kategorie: 'Lage',
        erstelltVon: generateValidUserId(),
      });
      const notiz = result.value!;
      notiz.clearDomainEvents();
      return notiz;
    };

    it('should update titel successfully', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        titel: 'Neuer Titel',
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.titel.value).toBe('Neuer Titel');
    });

    it('should update inhalt successfully', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        inhalt: 'Neuer Inhalt',
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.inhalt).toBe('Neuer Inhalt');
    });

    it('should update kategorie successfully', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        kategorie: 'Personal',
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.kategorie).toBe('Personal');
    });

    it('should set inhalt to null when null is provided', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        inhalt: null,
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.inhalt).toBeNull();
    });

    it('should set kategorie to null when null is provided', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        kategorie: null,
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.kategorie).toBeNull();
    });

    it('should trim whitespace in updated fields', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        titel: '  Neuer Titel  ',
        inhalt: '  Neuer Inhalt  ',
        kategorie: '  Neue Kategorie  ',
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.titel.value).toBe('Neuer Titel');
      expect(notiz.inhalt).toBe('Neuer Inhalt');
      expect(notiz.kategorie).toBe('Neue Kategorie');
    });

    it('should treat whitespace-only inhalt as null', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        inhalt: '   ',
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.inhalt).toBeNull();
    });

    it('should treat whitespace-only kategorie as null', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        kategorie: '   ',
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.kategorie).toBeNull();
    });

    it('should emit NotizAktualisiertEvent on successful update', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        titel: 'Aktualisierter Titel',
        aktualisiertVon: 'user-456',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = notiz.getDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(NotizAktualisiertEvent);

      const event = events[0] as NotizAktualisiertEvent;
      expect(event.notizId.toString()).toBe(notiz.id.toString());
      expect(event.einsatzId).toBe('einsatz-123');
      expect(event.titel).toBe('Aktualisierter Titel');
      expect(event.aktualisiertVon).toBe('user-456');
    });

    it('should fail when notiz is deleted', () => {
      // Given (Arrange) - reconstruct a deleted notiz
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Gelöschte Notiz').value!;
      const notiz = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: null,
        kategorie: null,
        istTeamsichtbar: false,
        erstelltVon: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: generateValidUserId(),
      });

      // When (Act)
      const result = notiz.update({
        titel: 'Neuer Titel',
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_ALREADY_DELETED');
    });

    it('should fail when no fields are changed', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_NO_CHANGES');
    });

    it('should fail when titel is empty', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        titel: '',
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
    });

    it('should fail when titel exceeds max length', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        titel: 'A'.repeat(101),
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
    });

    it('should fail when inhalt exceeds max length', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        inhalt: 'B'.repeat(2001),
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_INHALT_TOO_LONG');
    });

    it('should fail when kategorie exceeds max length', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        kategorie: 'K'.repeat(51),
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_KATEGORIE_TOO_LONG');
    });

    it('should update multiple fields at once', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        titel: 'Komplett Neuer Titel',
        inhalt: 'Komplett neuer Inhalt',
        kategorie: 'Personal',
        aktualisiertVon: 'user-789',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.titel.value).toBe('Komplett Neuer Titel');
      expect(notiz.inhalt).toBe('Komplett neuer Inhalt');
      expect(notiz.kategorie).toBe('Personal');
    });

    it('should update updatedAt timestamp on successful update', () => {
      // Given (Arrange)
      jest.useFakeTimers();
      try {
        const notiz = createValidNotiz();
        const originalUpdatedAt = notiz.updatedAt;

        // When (Act) - Zeit voranschreiten lassen, damit updatedAt sich ändert
        jest.advanceTimersByTime(1000);
        const result = notiz.update({
          titel: 'Aktualisierter Titel',
          aktualisiertVon: 'user-123',
        });

        // Then (Assert) - das Änderungsdatum wird aktualisiert
        expect(result.isSuccess).toBe(true);
        expect(notiz.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      } finally {
        jest.useRealTimers();
      }
    });

    it('should update istTeamsichtbar from false to true', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();
      expect(notiz.istTeamsichtbar).toBe(false);

      // When (Act)
      const result = notiz.update({
        istTeamsichtbar: true,
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.istTeamsichtbar).toBe(true);
    });

    it('should update istTeamsichtbar from true to false', () => {
      // Given (Arrange)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Teamsichtbare Notiz',
        inhalt: 'Originaler Inhalt',
        kategorie: 'Lage',
        istTeamsichtbar: true,
        erstelltVon: generateValidUserId(),
      });
      const notiz = result.value!;
      notiz.clearDomainEvents();
      expect(notiz.istTeamsichtbar).toBe(true);

      // When (Act)
      const updateResult = notiz.update({
        istTeamsichtbar: false,
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(updateResult.isSuccess).toBe(true);
      expect(notiz.istTeamsichtbar).toBe(false);
    });

    it('should accept update with only istTeamsichtbar change', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();

      // When (Act)
      const result = notiz.update({
        istTeamsichtbar: true,
        aktualisiertVon: 'user-123',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.istTeamsichtbar).toBe(true);

      const events = notiz.getDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(NotizAktualisiertEvent);
    });
  });

  describe('delete()', () => {
    /**
     * Erstellt eine gültige Notiz für Delete-Tests.
     */
    const createValidNotiz = () => {
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Zu löschende Notiz',
        inhalt: 'Inhalt der Notiz',
        kategorie: 'Lage',
        erstelltVon: generateValidUserId(),
      });
      const notiz = result.value!;
      notiz.clearDomainEvents();
      return notiz;
    };

    it('should soft-delete notiz successfully', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();
      const geloeschtVon = generateValidUserId();

      // When (Act)
      const result = notiz.delete(geloeschtVon);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(notiz.isDeleted).toBe(true);
      expect(notiz.deletedAt).toBeInstanceOf(Date);
      expect(notiz.deletedBy?.equals(geloeschtVon)).toBe(true);
    });

    it('should emit NotizGeloeschtEvent on delete', () => {
      // Given (Arrange)
      const notiz = createValidNotiz();
      const geloeschtVon = generateValidUserId();

      // When (Act)
      const result = notiz.delete(geloeschtVon);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = notiz.getDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(NotizGeloeschtEvent);

      const event = events[0] as NotizGeloeschtEvent;
      expect(event.notizId.toString()).toBe(notiz.id.toString());
      expect(event.einsatzId).toBe('einsatz-123');
      expect(event.titel).toBe('Zu löschende Notiz');
      expect(event.geloeschtVon.equals(geloeschtVon)).toBe(true);
    });

    it('should fail when notiz is already deleted', () => {
      // Given (Arrange)
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Bereits Gelöscht').value!;
      const notiz = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: null,
        kategorie: null,
        istTeamsichtbar: false,
        erstelltVon: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: generateValidUserId(),
      });

      // When (Act)
      const result = notiz.delete(generateValidUserId());

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('NOTIZ_ALREADY_DELETED');
      // Keine neuen Events
      expect(notiz.getDomainEvents().length).toBe(0);
    });

    it('should not emit event when delete fails on already deleted notiz', () => {
      // Given (Arrange) - Notiz erstellen und dann löschen
      const notiz = createValidNotiz();
      const geloeschtVon = generateValidUserId();
      notiz.delete(geloeschtVon);
      notiz.clearDomainEvents();

      // When (Act) - Nochmal löschen
      const result = notiz.delete(generateValidUserId());

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(notiz.getDomainEvents().length).toBe(0);
    });

    it('should set deletedAt to current time', () => {
      // Given (Arrange)
      jest.useFakeTimers();
      try {
        const now = new Date('2026-02-04T10:00:00.000Z');
        jest.setSystemTime(now);
        const notiz = createValidNotiz();

        // When (Act)
        const result = notiz.delete(generateValidUserId());

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(notiz.deletedAt?.getTime()).toBe(now.getTime());
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
