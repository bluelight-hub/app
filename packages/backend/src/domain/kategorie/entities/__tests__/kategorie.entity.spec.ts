// @ts-nocheck
import { Kategorie } from '../kategorie.entity';
import { KategorieErstelltEvent } from '@domain/kategorie/events/kategorie-erstellt.event';
import { KategorieGeloeschtEvent } from '@domain/kategorie/events/kategorie-geloescht.event';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { KategorieName } from '@domain/kategorie/value-objects/kategorie-name';
import { KategorieFarbe } from '@domain/kategorie/value-objects/kategorie-farbe';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Unit Tests fuer Kategorie Entity (Aggregate Root).
 *
 * Testet die Factory Methods und Business Rules gemaess AAA Pattern
 * mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - create(): Erfolgreiche Erstellung + Event Emission
 * - create(): Validierungsfehler (Name, Farbe)
 * - create(): Whitespace Trimming
 * - softDelete(): Erfolgreiche Loeschung
 * - softDelete(): Bereits geloeschte Kategorie
 */
describe('Kategorie Entity', () => {
  /**
   * Generiert eine gueltige UserId fuer Tests.
   */
  const generateValidUserId = () => UserId.create().value!;

  describe('Kategorie.create()', () => {
    it('should create a valid Kategorie with all properties', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const props = {
        einsatzId: 'einsatz-123',
        name: 'Lage',
        farbe: '#FF5733',
        erstelltVon,
      };

      // When (Act)
      const result = Kategorie.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();

      const kategorie = result.value!;
      expect(kategorie.id).toBeDefined();
      expect(kategorie.einsatzId).toBe('einsatz-123');
      expect(kategorie.name.value).toBe('Lage');
      expect(kategorie.farbe.value).toBe('#FF5733');
      expect(kategorie.erstelltVon.equals(erstelltVon)).toBe(true);
      expect(kategorie.geloeschtAm).toBeNull();
      expect(kategorie.createdAt).toBeInstanceOf(Date);
      expect(kategorie.updatedAt).toBeInstanceOf(Date);
    });

    it('should fail when name is empty', () => {
      // Given & When (Arrange & Act)
      const result = Kategorie.create({
        einsatzId: 'einsatz-123',
        name: '',
        farbe: '#FF5733',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('KATEGORIE_NAME_REQUIRED');
    });

    it('should fail when name exceeds 100 chars', () => {
      // Given & When (Arrange & Act)
      const tooLongName = 'A'.repeat(101);
      const result = Kategorie.create({
        einsatzId: 'einsatz-123',
        name: tooLongName,
        farbe: '#FF5733',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('KATEGORIE_NAME_TOO_LONG');
    });

    it('should fail when farbe has invalid format', () => {
      // Given & When (Arrange & Act)
      const result = Kategorie.create({
        einsatzId: 'einsatz-123',
        name: 'Lage',
        farbe: 'red',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('KATEGORIE_FARBE_INVALID');
    });

    it('should fail with valid hex without # prefix', () => {
      // Given & When (Arrange & Act)
      const result = Kategorie.create({
        einsatzId: 'einsatz-123',
        name: 'Lage',
        farbe: 'FF5733',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('KATEGORIE_FARBE_INVALID');
    });

    it('should add KategorieErstelltEvent on create', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const props = {
        einsatzId: 'einsatz-789',
        name: 'Personal',
        farbe: '#00FF00',
        erstelltVon,
      };

      // When (Act)
      const result = Kategorie.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const kategorie = result.value!;

      const events = kategorie.getDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(KategorieErstelltEvent);

      const event = events[0] as KategorieErstelltEvent;
      expect(event.kategorieId.toString()).toBe(kategorie.id.toString());
      expect(event.einsatzId).toBe('einsatz-789');
      expect(event.name).toBe('Personal');
      expect(event.farbe).toBe('#00FF00');
      expect(event.erstelltVon.equals(erstelltVon)).toBe(true);
    });

    it('should trim whitespace from name', () => {
      // Given & When (Arrange & Act)
      const result = Kategorie.create({
        einsatzId: 'einsatz-123',
        name: '  Lage  ',
        farbe: '#FF5733',
        erstelltVon: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name.value).toBe('Lage');
    });
  });

  describe('Kategorie.softDelete()', () => {
    it('should set geloeschtAm', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const props = {
        einsatzId: 'einsatz-123',
        name: 'Zu loeschende Kategorie',
        farbe: '#FF5733',
        erstelltVon,
      };
      const kategorie = Kategorie.create(props).value!;
      kategorie.clearDomainEvents();

      const geloeschtVon = generateValidUserId();

      // When (Act)
      const result = kategorie.softDelete(geloeschtVon);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(kategorie.geloeschtAm).toBeInstanceOf(Date);
    });

    it('should track geloeschtVon in softDelete', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const props = {
        einsatzId: 'einsatz-123',
        name: 'Kategorie mit Audit Trail',
        farbe: '#FF5733',
        erstelltVon,
      };
      const kategorie = Kategorie.create(props).value!;
      kategorie.clearDomainEvents();

      const geloeschtVon = generateValidUserId();

      // When (Act)
      kategorie.softDelete(geloeschtVon);

      // Then (Assert)
      expect(kategorie.geloeschtVon).toBeDefined();
      expect(kategorie.geloeschtVon?.equals(geloeschtVon)).toBe(true);
    });

    it('should fail when already deleted', () => {
      // Given (Arrange)
      const id = KategorieId.create().value! as KategorieId;
      const name = KategorieName.create('Gelöschte Kategorie').value!;
      const farbe = KategorieFarbe.create('#FF5733').value!;
      const erstelltVon = generateValidUserId();
      const geloeschtVon = generateValidUserId();
      const kategorie = Kategorie.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        name,
        farbe,
        erstelltVon,
        createdAt: new Date(),
        updatedAt: new Date(),
        geloeschtAm: new Date(),
        geloeschtVon,
      });

      // When (Act)
      const result = kategorie.softDelete(generateValidUserId());

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('KATEGORIE_ALREADY_DELETED');
    });

    it('should add KategorieGeloeschtEvent', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const props = {
        einsatzId: 'einsatz-123',
        name: 'Zu loeschende Kategorie',
        farbe: '#FF5733',
        erstelltVon,
      };
      const kategorie = Kategorie.create(props).value!;
      kategorie.clearDomainEvents();

      const geloeschtVon = generateValidUserId();

      // When (Act)
      const result = kategorie.softDelete(geloeschtVon);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = kategorie.getDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(KategorieGeloeschtEvent);

      const event = events[0] as KategorieGeloeschtEvent;
      expect(event.kategorieId.toString()).toBe(kategorie.id.toString());
      expect(event.einsatzId).toBe('einsatz-123');
      expect(event.name).toBe('Zu loeschende Kategorie');
      expect(event.geloeschtVon.equals(geloeschtVon)).toBe(true);
    });
  });
});
