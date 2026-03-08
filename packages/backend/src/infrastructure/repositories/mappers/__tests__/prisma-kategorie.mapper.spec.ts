// @ts-nocheck
/**
 * Unit Tests fuer PrismaKategorieMapper.
 *
 * Testet die bidirektionale Konvertierung zwischen Prisma Model und Domain Entity.
 *
 * **Test Coverage:**
 * - toDomain(): Gueltige Prisma Records zu Domain Entity
 * - toDomain(): Soft-Deleted Records mit geloeschtAm/geloeschtVon
 * - toDomain(): Ungueltige Daten werfen Fehler
 * - toPersistence(): Domain Entity zu Prisma-kompatiblen Daten
 * - toPersistence(): Soft-Deleted Entities
 */
import type { Kategorie as PrismaKategorie } from '@/generated/prisma/client';
import { PrismaKategorieMapper } from '../prisma-kategorie.mapper';
import { Kategorie } from '@domain/kategorie/entities/kategorie.entity';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { KategorieName } from '@domain/kategorie/value-objects/kategorie-name';
import { KategorieFarbe } from '@domain/kategorie/value-objects/kategorie-farbe';
import { UserId } from '@domain/value-objects/user-id';

describe('PrismaKategorieMapper', () => {
  /**
   * Generiert eine gueltige UserId fuer Tests.
   */
  const generateValidUserId = () => UserId.create().value!;

  /**
   * Erzeugt einen gueltigen Prisma Kategorie Record fuer Tests.
   */
  const createValidPrismaRecord = (overrides: Partial<PrismaKategorie> = {}): PrismaKategorie => ({
    id: KategorieId.create().value?.toString(),
    einsatzId: 'einsatz-123',
    name: 'Lage',
    farbe: '#FF5733',
    erstelltVon: generateValidUserId().toString(),
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    geloeschtAm: null,
    geloeschtVon: null,
    ...overrides,
  });

  describe('toDomain()', () => {
    it('should map a valid Prisma record to a Kategorie entity', () => {
      // Given: Gueltiger Prisma Record
      const prismaRecord = createValidPrismaRecord();

      // When: Mapping zu Domain Entity
      const kategorie = PrismaKategorieMapper.toDomain(prismaRecord);

      // Then: Alle Properties korrekt gemapped
      expect(kategorie).toBeInstanceOf(Kategorie);
      expect(kategorie.id.toString()).toBe(prismaRecord.id);
      expect(kategorie.einsatzId).toBe('einsatz-123');
      expect(kategorie.name.value).toBe('Lage');
      expect(kategorie.farbe.value).toBe('#FF5733');
      expect(kategorie.erstelltVon.toString()).toBe(prismaRecord.erstelltVon);
      expect(kategorie.createdAt).toEqual(prismaRecord.createdAt);
      expect(kategorie.updatedAt).toEqual(prismaRecord.updatedAt);
      expect(kategorie.geloeschtAm).toBeNull();
      expect(kategorie.geloeschtVon).toBeNull();
    });

    it('should map a soft-deleted Prisma record with geloeschtAm and geloeschtVon', () => {
      // Given: Soft-Deleted Prisma Record
      const geloeschtVonId = generateValidUserId().toString();
      const geloeschtAm = new Date('2026-01-16T12:00:00Z');
      const prismaRecord = createValidPrismaRecord({
        geloeschtAm,
        geloeschtVon: geloeschtVonId,
      });

      // When: Mapping zu Domain Entity
      const kategorie = PrismaKategorieMapper.toDomain(prismaRecord);

      // Then: Soft-Delete Felder korrekt gemapped
      expect(kategorie.geloeschtAm).toEqual(geloeschtAm);
      expect(kategorie.geloeschtVon).toBeDefined();
      expect(kategorie.geloeschtVon?.toString()).toBe(geloeschtVonId);
    });

    it('should throw an error for invalid KategorieId', () => {
      // Given: Prisma Record mit ungueltiger ID
      const prismaRecord = createValidPrismaRecord({ id: '' });

      // When & Then: Fehler bei ungueltigem ID
      expect(() => PrismaKategorieMapper.toDomain(prismaRecord)).toThrow('Ungueltige KategorieId');
    });

    it('should throw an error for invalid KategorieName', () => {
      // Given: Prisma Record mit leerem Namen
      const prismaRecord = createValidPrismaRecord({ name: '' });

      // When & Then: Fehler bei ungueltigem Namen
      expect(() => PrismaKategorieMapper.toDomain(prismaRecord)).toThrow('Ungueltiger KategorieName');
    });

    it('should throw an error for invalid KategorieFarbe', () => {
      // Given: Prisma Record mit ungueltiger Farbe
      const prismaRecord = createValidPrismaRecord({ farbe: 'red' });

      // When & Then: Fehler bei ungueltiger Farbe
      expect(() => PrismaKategorieMapper.toDomain(prismaRecord)).toThrow('Ungueltige KategorieFarbe');
    });

    it('should throw an error for invalid erstelltVon UserId', () => {
      // Given: Prisma Record mit ungueltiger erstelltVon
      const prismaRecord = createValidPrismaRecord({ erstelltVon: '' });

      // When & Then: Fehler bei ungueltiger UserId
      expect(() => PrismaKategorieMapper.toDomain(prismaRecord)).toThrow('Ungueltige ErstelltVon UserId');
    });

    it('should throw an error for invalid geloeschtVon UserId', () => {
      // Given: Prisma Record mit ungueltiger geloeschtVon (truthy aber ungueltig)
      const prismaRecord = createValidPrismaRecord({
        geloeschtAm: new Date(),
        geloeschtVon: 'x',
      });

      // When & Then: Fehler bei ungueltiger GeloeschtVon UserId
      expect(() => PrismaKategorieMapper.toDomain(prismaRecord)).toThrow('Ungueltige GeloeschtVon UserId');
    });
  });

  describe('toPersistence()', () => {
    it('should map a Kategorie entity to Prisma-compatible data', () => {
      // Given: Gueltige Kategorie Entity
      const erstelltVon = generateValidUserId();
      const result = Kategorie.create({
        einsatzId: 'einsatz-456',
        name: 'Personal',
        farbe: '#00FF00',
        erstelltVon,
      });
      expect(result.isSuccess).toBe(true);
      const kategorie = result.value!;

      // When: Mapping zu Persistence Daten
      const persistenceData = PrismaKategorieMapper.toPersistence(kategorie);

      // Then: Alle Properties korrekt konvertiert
      expect(persistenceData.id).toBe(kategorie.id.toString());
      expect(persistenceData.einsatzId).toBe('einsatz-456');
      expect(persistenceData.name).toBe('Personal');
      expect(persistenceData.farbe).toBe('#00FF00');
      expect(persistenceData.erstelltVon).toBe(erstelltVon.toString());
      expect(persistenceData.geloeschtAm).toBeNull();
      expect(persistenceData.geloeschtVon).toBeNull();
      expect(persistenceData.createdAt).toBeInstanceOf(Date);
      expect(persistenceData.updatedAt).toBeInstanceOf(Date);
    });

    it('should map a soft-deleted Kategorie entity correctly', () => {
      // Given: Soft-Deleted Kategorie via reconstruct
      const id = KategorieId.create().value! as KategorieId;
      const name = KategorieName.create('Geloeschte Kategorie').value!;
      const farbe = KategorieFarbe.create('#FF0000').value!;
      const erstelltVon = generateValidUserId();
      const geloeschtVon = generateValidUserId();
      const geloeschtAm = new Date('2026-01-20T15:00:00Z');

      const kategorie = Kategorie.reconstruct({
        id,
        einsatzId: 'einsatz-789',
        name,
        farbe,
        erstelltVon,
        createdAt: new Date('2026-01-15T10:00:00Z'),
        updatedAt: new Date('2026-01-15T10:00:00Z'),
        geloeschtAm,
        geloeschtVon,
      });

      // When: Mapping zu Persistence Daten
      const persistenceData = PrismaKategorieMapper.toPersistence(kategorie);

      // Then: Soft-Delete Felder korrekt konvertiert
      expect(persistenceData.geloeschtAm).toEqual(geloeschtAm);
      expect(persistenceData.geloeschtVon).toBe(geloeschtVon.toString());
    });

    it('should produce a roundtrip-compatible result (toDomain -> toPersistence)', () => {
      // Given: Prisma Record -> Domain Entity
      const prismaRecord = createValidPrismaRecord();
      const kategorie = PrismaKategorieMapper.toDomain(prismaRecord);

      // When: Domain Entity -> Persistence Daten
      const persistenceData = PrismaKategorieMapper.toPersistence(kategorie);

      // Then: Roundtrip-Konsistenz
      expect(persistenceData.id).toBe(prismaRecord.id);
      expect(persistenceData.einsatzId).toBe(prismaRecord.einsatzId);
      expect(persistenceData.name).toBe(prismaRecord.name);
      expect(persistenceData.farbe).toBe(prismaRecord.farbe);
      expect(persistenceData.erstelltVon).toBe(prismaRecord.erstelltVon);
      expect(persistenceData.createdAt).toEqual(prismaRecord.createdAt);
      expect(persistenceData.updatedAt).toEqual(prismaRecord.updatedAt);
    });
  });
});
