import { Erinnerungsvorlage } from '../erinnerungsvorlage.entity';
import { ErinnerungsvorlageErstelltEvent } from '@domain/erinnerungsvorlage/events/erinnerungsvorlage-erstellt.event';
import { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import { ErinnerungsvorlageTitel } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-titel';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Unit Tests für Erinnerungsvorlage Entity (Aggregate Root).
 *
 * Testet die Factory Methods und Business Rules gemäß AAA Pattern
 * mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - create(): Erfolgreiche Erstellung + Event Emission
 * - create(): Validierungsfehler (Titel, Minuten, Beschreibung)
 * - reconstruct(): Rekonstruktion aus DB ohne Events
 */
describe('Erinnerungsvorlage Entity', () => {
  /**
   * Generiert eine gültige UserId für Tests.
   */
  const generateValidUserId = () => UserId.create().value!;

  describe('create()', () => {
    it('should create erinnerungsvorlage successfully', () => {
      // Given (Arrange)
      const createdBy = generateValidUserId();
      const props = {
        titel: 'Lagebesprechung',
        minuten: 30,
        beschreibung: 'Regelmäßige Lagebesprechung im ELW',
        createdBy,
      };

      // When (Act)
      const result = Erinnerungsvorlage.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();

      const vorlage = result.value!;
      expect(vorlage.id).toBeDefined();
      expect(vorlage.titel.value).toBe('Lagebesprechung');
      expect(vorlage.minuten).toBe(30);
      expect(vorlage.beschreibung).toBe('Regelmäßige Lagebesprechung im ELW');
      expect(vorlage.createdBy.equals(createdBy)).toBe(true);
      expect(vorlage.isDeleted).toBe(false);
      expect(vorlage.deletedAt).toBeNull();
      expect(vorlage.deletedBy).toBeNull();
      expect(vorlage.createdAt).toBeInstanceOf(Date);
      expect(vorlage.updatedAt).toBeInstanceOf(Date);
    });

    it('should create vorlage without beschreibung', () => {
      // Given (Arrange)
      const props = {
        titel: 'Ablösung',
        minuten: 60,
        createdBy: generateValidUserId(),
      };

      // When (Act)
      const result = Erinnerungsvorlage.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBeNull();
    });

    it('should emit ErinnerungsvorlageErstelltEvent on create', () => {
      // Given (Arrange)
      const createdBy = generateValidUserId();
      const props = {
        titel: 'Lagebesprechung',
        minuten: 30,
        createdBy,
      };

      // When (Act)
      const result = Erinnerungsvorlage.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const vorlage = result.value!;

      const events = vorlage.getDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(ErinnerungsvorlageErstelltEvent);

      const event = events[0] as ErinnerungsvorlageErstelltEvent;
      expect(event.vorlageId.toString()).toBe(vorlage.id.toString());
      expect(event.titel).toBe('Lagebesprechung');
      expect(event.minuten).toBe(30);
      expect(event.createdBy.equals(createdBy)).toBe(true);
    });

    it('should fail when titel is empty', () => {
      // Given & When (Arrange & Act)
      const result = Erinnerungsvorlage.create({
        titel: '',
        minuten: 30,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('VORLAGE_TITEL_REQUIRED');
    });

    it('should fail when titel is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = Erinnerungsvorlage.create({
        titel: '   ',
        minuten: 30,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('VORLAGE_TITEL_REQUIRED');
    });

    it('should fail when titel exceeds max length', () => {
      // Given & When (Arrange & Act)
      const tooLongTitel = 'A'.repeat(101);
      const result = Erinnerungsvorlage.create({
        titel: tooLongTitel,
        minuten: 30,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('VORLAGE_TITEL_TOO_LONG');
    });

    it('should fail when minuten is less than 1', () => {
      // Given & When (Arrange & Act)
      const result = Erinnerungsvorlage.create({
        titel: 'Test Vorlage',
        minuten: 0,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('VORLAGE_MINUTEN_INVALID');
    });

    it('should fail when minuten is negative', () => {
      // Given & When (Arrange & Act)
      const result = Erinnerungsvorlage.create({
        titel: 'Test Vorlage',
        minuten: -10,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('VORLAGE_MINUTEN_INVALID');
    });

    it('should fail when beschreibung exceeds max length', () => {
      // Given & When (Arrange & Act)
      const tooLongBeschreibung = 'B'.repeat(501);
      const result = Erinnerungsvorlage.create({
        titel: 'Test Vorlage',
        minuten: 30,
        beschreibung: tooLongBeschreibung,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('VORLAGE_BESCHREIBUNG_TOO_LONG');
    });

    it('should accept beschreibung with exactly 500 characters', () => {
      // Given & When (Arrange & Act)
      const maxBeschreibung = 'B'.repeat(500);
      const result = Erinnerungsvorlage.create({
        titel: 'Test Vorlage',
        minuten: 30,
        beschreibung: maxBeschreibung,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBe(maxBeschreibung);
    });

    it('should accept minuten of exactly 1', () => {
      // Given & When (Arrange & Act)
      const result = Erinnerungsvorlage.create({
        titel: 'Minimale Vorlage',
        minuten: 1,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.minuten).toBe(1);
    });

    it('should trim titel and beschreibung whitespace', () => {
      // Given & When (Arrange & Act)
      const result = Erinnerungsvorlage.create({
        titel: '  Lagebesprechung  ',
        minuten: 30,
        beschreibung: '  Im ELW  ',
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.titel.value).toBe('Lagebesprechung');
      expect(result.value!.beschreibung).toBe('Im ELW');
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct entity without emitting events', () => {
      // Given (Arrange)
      const id = ErinnerungsvorlageId.create().value! as ErinnerungsvorlageId;
      const titel = ErinnerungsvorlageTitel.create('Lagebesprechung').value!;
      const createdBy = generateValidUserId();
      const createdAt = new Date('2026-01-19T10:00:00.000Z');
      const updatedAt = new Date('2026-01-19T10:30:00.000Z');

      // When (Act)
      const vorlage = Erinnerungsvorlage.reconstruct({
        id,
        titel,
        minuten: 30,
        beschreibung: 'Test Beschreibung',
        createdBy,
        createdAt,
        updatedAt,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(vorlage).toBeDefined();
      expect(vorlage.id.equals(id)).toBe(true);
      expect(vorlage.titel.value).toBe('Lagebesprechung');
      expect(vorlage.minuten).toBe(30);
      expect(vorlage.beschreibung).toBe('Test Beschreibung');
      expect(vorlage.createdBy.equals(createdBy)).toBe(true);
      expect(vorlage.createdAt).toEqual(createdAt);
      expect(vorlage.updatedAt).toEqual(updatedAt);
      expect(vorlage.isDeleted).toBe(false);
      expect(vorlage.deletedAt).toBeNull();
      expect(vorlage.deletedBy).toBeNull();

      // CRITICAL: reconstruct() darf KEINE Domain Events emittieren
      const events = vorlage.getDomainEvents();
      expect(events.length).toBe(0);
    });

    it('should reconstruct deleted entity correctly', () => {
      // Given (Arrange)
      const id = ErinnerungsvorlageId.create().value! as ErinnerungsvorlageId;
      const titel = ErinnerungsvorlageTitel.create('Gelöschte Vorlage').value!;
      const createdBy = generateValidUserId();
      const deletedBy = generateValidUserId();
      const deletedAt = new Date('2026-01-20T12:00:00.000Z');

      // When (Act)
      const vorlage = Erinnerungsvorlage.reconstruct({
        id,
        titel,
        minuten: 60,
        beschreibung: null,
        createdBy,
        createdAt: new Date('2026-01-19T10:00:00.000Z'),
        updatedAt: new Date('2026-01-20T12:00:00.000Z'),
        isDeleted: true,
        deletedAt,
        deletedBy,
      });

      // Then (Assert)
      expect(vorlage.isDeleted).toBe(true);
      expect(vorlage.deletedAt).toEqual(deletedAt);
      expect(vorlage.deletedBy!.equals(deletedBy)).toBe(true);

      // CRITICAL: reconstruct() darf KEINE Domain Events emittieren
      expect(vorlage.getDomainEvents().length).toBe(0);
    });

    it('should reconstruct entity with null beschreibung', () => {
      // Given (Arrange)
      const id = ErinnerungsvorlageId.create().value! as ErinnerungsvorlageId;
      const titel = ErinnerungsvorlageTitel.create('Ohne Beschreibung').value!;

      // When (Act)
      const vorlage = Erinnerungsvorlage.reconstruct({
        id,
        titel,
        minuten: 15,
        beschreibung: null,
        createdBy: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(vorlage.beschreibung).toBeNull();
    });
  });

  describe('Identity Equality', () => {
    it('should be equal when IDs match', () => {
      // Given (Arrange)
      const id = ErinnerungsvorlageId.create().value! as ErinnerungsvorlageId;
      const titel1 = ErinnerungsvorlageTitel.create('Vorlage A').value!;
      const titel2 = ErinnerungsvorlageTitel.create('Vorlage B').value!;

      // When (Act)
      const vorlage1 = Erinnerungsvorlage.reconstruct({
        id,
        titel: titel1,
        minuten: 30,
        beschreibung: null,
        createdBy: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      const vorlage2 = Erinnerungsvorlage.reconstruct({
        id, // gleiche ID
        titel: titel2, // anderer Titel
        minuten: 60, // andere Minuten
        beschreibung: 'Beschreibung',
        createdBy: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(vorlage1.equals(vorlage2)).toBe(true);
    });

    it('should not be equal when IDs differ', () => {
      // Given (Arrange)
      const titel = ErinnerungsvorlageTitel.create('Gleicher Titel').value!;
      const createdBy = generateValidUserId();

      // When (Act)
      const vorlage1 = Erinnerungsvorlage.reconstruct({
        id: ErinnerungsvorlageId.create().value! as ErinnerungsvorlageId,
        titel,
        minuten: 30,
        beschreibung: null,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      const vorlage2 = Erinnerungsvorlage.reconstruct({
        id: ErinnerungsvorlageId.create().value! as ErinnerungsvorlageId, // andere ID
        titel,
        minuten: 30,
        beschreibung: null,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(vorlage1.equals(vorlage2)).toBe(false);
    });
  });
});
