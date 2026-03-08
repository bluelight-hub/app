// @ts-nocheck
import { PrismaNotizMapper } from '../prisma-notiz.mapper';
import { Notiz } from '@domain/notiz/entities/notiz.entity';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { NotizTitel } from '@domain/notiz/value-objects/notiz-titel';
import { UserId } from '@domain/value-objects/user-id';
import type { Notiz as PrismaNotiz } from '@/generated/prisma/client';

/**
 * Unit Tests fuer PrismaNotizMapper.
 *
 * Testet die Konvertierung zwischen Prisma Model und Domain Entity
 * fuer Notiz gemaess AAA Pattern mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - toDomain(): Gueltige Prisma Records zu Domain Entity
 * - toDomain(): Edge Cases (null kategorie, geloeschte Records, Team-Sichtbarkeit)
 * - toPersistence(): Domain Entity zu Prisma-kompatiblen Daten
 * - Roundtrip: toDomain() → toPersistence() Konsistenz
 */
describe('PrismaNotizMapper', () => {
  /**
   * Generiert eine gueltige UserId fuer Tests.
   */
  const generateValidUserId = () => UserId.create().value!;

  /**
   * Erstellt einen gueltigen Prisma Notiz Record fuer Tests.
   */
  const createValidPrismaNotiz = (overrides: Partial<PrismaNotiz> = {}): PrismaNotiz => {
    const userId = generateValidUserId();
    return {
      id: NotizId.create().value?.toString(),
      einsatzId: 'einsatz-123',
      titel: 'Wichtige Beobachtung',
      inhalt: 'Rauchentwicklung im Nordosten beobachtet',
      kategorie: 'Lage',
      kategorieId: 'kat-001',
      istTeamsichtbar: false,
      erstelltVon: userId.toString(),
      createdAt: new Date('2026-02-03T10:00:00.000Z'),
      updatedAt: new Date('2026-02-03T10:30:00.000Z'),
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      ...overrides,
    } as PrismaNotiz;
  };

  describe('toDomain()', () => {
    it('should convert valid prisma record to domain entity', () => {
      // Given (Arrange)
      const prismaNotiz = createValidPrismaNotiz();

      // When (Act)
      const notiz = PrismaNotizMapper.toDomain(prismaNotiz);

      // Then (Assert)
      expect(notiz).toBeInstanceOf(Notiz);
      expect(notiz.id.toString()).toBe(prismaNotiz.id);
      expect(notiz.einsatzId).toBe('einsatz-123');
      expect(notiz.titel.value).toBe('Wichtige Beobachtung');
      expect(notiz.inhalt).toBe('Rauchentwicklung im Nordosten beobachtet');
      expect(notiz.kategorie).toBe('Lage');
      expect(notiz.kategorieId).toBe('kat-001');
      expect(notiz.istTeamsichtbar).toBe(false);
      expect(notiz.erstelltVon.toString()).toBe(prismaNotiz.erstelltVon);
      expect(notiz.createdAt).toEqual(new Date('2026-02-03T10:00:00.000Z'));
      expect(notiz.updatedAt).toEqual(new Date('2026-02-03T10:30:00.000Z'));
      expect(notiz.isDeleted).toBe(false);
      expect(notiz.deletedAt).toBeNull();
      expect(notiz.deletedBy).toBeNull();
    });

    it('should convert prisma record with null kategorie', () => {
      // Given (Arrange)
      const prismaNotiz = createValidPrismaNotiz({
        kategorie: null,
        kategorieId: null,
      });

      // When (Act)
      const notiz = PrismaNotizMapper.toDomain(prismaNotiz);

      // Then (Assert)
      expect(notiz.kategorie).toBeNull();
      expect(notiz.kategorieId).toBeNull();
    });

    it('should convert prisma record with null inhalt', () => {
      // Given (Arrange)
      const prismaNotiz = createValidPrismaNotiz({ inhalt: null });

      // When (Act)
      const notiz = PrismaNotizMapper.toDomain(prismaNotiz);

      // Then (Assert)
      expect(notiz.inhalt).toBeNull();
    });

    it('should convert deleted prisma record correctly', () => {
      // Given (Arrange)
      const deletedByUserId = generateValidUserId();
      const deletedAt = new Date('2026-02-03T12:00:00.000Z');
      const prismaNotiz = createValidPrismaNotiz({
        isDeleted: true,
        deletedAt,
        deletedBy: deletedByUserId.toString(),
      });

      // When (Act)
      const notiz = PrismaNotizMapper.toDomain(prismaNotiz);

      // Then (Assert)
      expect(notiz.isDeleted).toBe(true);
      expect(notiz.deletedAt).toEqual(deletedAt);
      expect(notiz.deletedBy).not.toBeNull();
      expect(notiz.deletedBy?.toString()).toBe(deletedByUserId.toString());
    });

    it('should convert prisma record with istTeamsichtbar=true', () => {
      // Given (Arrange)
      const prismaNotiz = createValidPrismaNotiz({ istTeamsichtbar: true });

      // When (Act)
      const notiz = PrismaNotizMapper.toDomain(prismaNotiz);

      // Then (Assert)
      expect(notiz.istTeamsichtbar).toBe(true);
    });

    it('should not emit domain events on reconstruct via toDomain', () => {
      // Given (Arrange)
      const prismaNotiz = createValidPrismaNotiz();

      // When (Act)
      const notiz = PrismaNotizMapper.toDomain(prismaNotiz);

      // Then (Assert) - reconstruct() darf KEINE Events emittieren
      expect(notiz.getDomainEvents().length).toBe(0);
    });

    it('should throw error for invalid notiz id', () => {
      // Given (Arrange)
      const prismaNotiz = createValidPrismaNotiz({ id: '' });

      // When & Then (Act & Assert)
      expect(() => PrismaNotizMapper.toDomain(prismaNotiz)).toThrow('Ungueltige NotizId');
    });

    it('should throw error for invalid titel', () => {
      // Given (Arrange)
      const prismaNotiz = createValidPrismaNotiz({ titel: '' });

      // When & Then (Act & Assert)
      expect(() => PrismaNotizMapper.toDomain(prismaNotiz)).toThrow('Ungueltiger NotizTitel');
    });

    it('should throw error for invalid erstelltVon user id', () => {
      // Given (Arrange)
      const prismaNotiz = createValidPrismaNotiz({ erstelltVon: '' });

      // When & Then (Act & Assert)
      expect(() => PrismaNotizMapper.toDomain(prismaNotiz)).toThrow('Ungueltige ErstelltVon UserId');
    });
  });

  describe('toPersistence()', () => {
    it('should convert domain entity to prisma-compatible data', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const result = Notiz.create({
        einsatzId: 'einsatz-456',
        titel: 'Lagenotiz',
        inhalt: 'Starker Wind aus Suedwest',
        kategorie: 'Wetter',
        kategorieId: 'kat-002',
        erstelltVon,
      });
      const notiz = result.value!;

      // When (Act)
      const persistence = PrismaNotizMapper.toPersistence(notiz);

      // Then (Assert)
      expect(persistence.id).toBe(notiz.id.toString());
      expect(persistence.einsatzId).toBe('einsatz-456');
      expect(persistence.titel).toBe('Lagenotiz');
      expect(persistence.inhalt).toBe('Starker Wind aus Suedwest');
      expect(persistence.kategorie).toBe('Wetter');
      expect(persistence.kategorieId).toBe('kat-002');
      expect(persistence.istTeamsichtbar).toBe(false);
      expect(persistence.erstelltVon).toBe(erstelltVon.toString());
      expect(persistence.isDeleted).toBe(false);
      expect(persistence.createdAt).toBeInstanceOf(Date);
      expect(persistence.updatedAt).toBeInstanceOf(Date);
      expect(persistence.deletedAt).toBeNull();
      expect(persistence.deletedBy).toBeNull();
    });

    it('should convert entity with null optional fields', () => {
      // Given (Arrange)
      const result = Notiz.create({
        einsatzId: 'einsatz-789',
        titel: 'Kurze Notiz',
        erstelltVon: generateValidUserId(),
      });
      const notiz = result.value!;

      // When (Act)
      const persistence = PrismaNotizMapper.toPersistence(notiz);

      // Then (Assert)
      expect(persistence.inhalt).toBeNull();
      expect(persistence.kategorie).toBeNull();
      expect(persistence.kategorieId).toBeNull();
    });

    it('should convert entity with istTeamsichtbar=true', () => {
      // Given (Arrange)
      const result = Notiz.create({
        einsatzId: 'einsatz-123',
        titel: 'Teamsichtbare Notiz',
        istTeamsichtbar: true,
        erstelltVon: generateValidUserId(),
      });
      const notiz = result.value!;

      // When (Act)
      const persistence = PrismaNotizMapper.toPersistence(notiz);

      // Then (Assert)
      expect(persistence.istTeamsichtbar).toBe(true);
    });

    it('should convert deleted entity with deletedBy user id', () => {
      // Given (Arrange)
      const erstelltVon = generateValidUserId();
      const deletedBy = generateValidUserId();
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Geloeschte Notiz').value!;
      const deletedAt = new Date('2026-02-03T14:00:00.000Z');

      const notiz = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: null,
        kategorie: null,
        kategorieId: null,
        istTeamsichtbar: false,
        erstelltVon,
        createdAt: new Date('2026-02-03T10:00:00.000Z'),
        updatedAt: new Date('2026-02-03T14:00:00.000Z'),
        isDeleted: true,
        deletedAt,
        deletedBy,
      });

      // When (Act)
      const persistence = PrismaNotizMapper.toPersistence(notiz);

      // Then (Assert)
      expect(persistence.isDeleted).toBe(true);
      expect(persistence.deletedAt).toEqual(deletedAt);
      expect(persistence.deletedBy).toBe(deletedBy.toString());
    });
  });

  describe('Roundtrip (toDomain → toPersistence)', () => {
    it('should preserve all data through roundtrip conversion', () => {
      // Given (Arrange) - Prisma Record erstellen
      const userId = generateValidUserId();
      const prismaNotiz = createValidPrismaNotiz({
        erstelltVon: userId.toString(),
        kategorieId: 'kat-roundtrip',
      });

      // When (Act) - toDomain → toPersistence
      const domainEntity = PrismaNotizMapper.toDomain(prismaNotiz);
      const persistence = PrismaNotizMapper.toPersistence(domainEntity);

      // Then (Assert) - Alle Felder muessen uebereinstimmen
      expect(persistence.id).toBe(prismaNotiz.id);
      expect(persistence.einsatzId).toBe(prismaNotiz.einsatzId);
      expect(persistence.titel).toBe(prismaNotiz.titel);
      expect(persistence.inhalt).toBe(prismaNotiz.inhalt);
      expect(persistence.kategorie).toBe(prismaNotiz.kategorie);
      expect(persistence.kategorieId).toBe(prismaNotiz.kategorieId);
      expect(persistence.istTeamsichtbar).toBe(prismaNotiz.istTeamsichtbar);
      expect(persistence.erstelltVon).toBe(prismaNotiz.erstelltVon);
      expect(persistence.createdAt).toEqual(prismaNotiz.createdAt);
      expect(persistence.updatedAt).toEqual(prismaNotiz.updatedAt);
      expect(persistence.isDeleted).toBe(prismaNotiz.isDeleted);
      expect(persistence.deletedAt).toEqual(prismaNotiz.deletedAt);
      expect(persistence.deletedBy).toEqual(prismaNotiz.deletedBy);
    });

    it('should preserve deleted state through roundtrip', () => {
      // Given (Arrange)
      const deletedByUserId = generateValidUserId();
      const prismaNotiz = createValidPrismaNotiz({
        isDeleted: true,
        deletedAt: new Date('2026-02-03T15:00:00.000Z'),
        deletedBy: deletedByUserId.toString(),
      });

      // When (Act)
      const domainEntity = PrismaNotizMapper.toDomain(prismaNotiz);
      const persistence = PrismaNotizMapper.toPersistence(domainEntity);

      // Then (Assert)
      expect(persistence.isDeleted).toBe(true);
      expect(persistence.deletedAt).toEqual(prismaNotiz.deletedAt);
      expect(persistence.deletedBy).toBe(prismaNotiz.deletedBy);
    });
  });
});
