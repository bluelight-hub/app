import { PrismaBefehlMapper } from '../prisma-befehl.mapper';
import { Befehl } from '@domain/aggregates/befehl.aggregate';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import type { Befehl as PrismaBefehl, BefehlEmpfaenger as PrismaBefehlEmpfaenger, BefehlKommentar as PrismaBefehlKommentar } from '@/generated/prisma/client';

type BefehlWithRelations = PrismaBefehl & {
  empfaenger: PrismaBefehlEmpfaenger[];
  kommentare: PrismaBefehlKommentar[];
};

/**
 * Unit Tests für PrismaBefehlMapper.
 *
 * Testet bidirektionale Konvertierung Prisma ↔ Domain Aggregate.
 */
describe('PrismaBefehlMapper', () => {
  const generateValidUserId = () => UserId.create().value!;
  const generateValidBefehlId = () => (BefehlId.create().value! as BefehlId).value;
  const generateValidEinsatzId = () => (EinsatzId.create().value! as EinsatzId).value;

  const createValidPrismaBefehl = (overrides: Partial<BefehlWithRelations & { befehlsgeberName: string }> = {}): BefehlWithRelations => {
    const befehlId = generateValidBefehlId();
    const einsatzId = generateValidEinsatzId();
    const befehlsgeberId = generateValidUserId().value;
    const erstellerId = generateValidUserId().value;

    return {
      id: befehlId,
      nummer: 'B-001',
      einsatzId,
      auftrag: 'Patientenablage einrichten',
      befehlsgeberName: 'EL Müller',
      befehlsgeberId,
      erstellerId,
      status: 'ERTEILT',
      zeitvorgabe: '15 min',
      ereignis: null,
      mittel: null,
      ziel: null,
      weg: null,
      originalBefehlId: null,
      erteiltAm: new Date('2026-02-17T10:00:00.000Z'),
      createdAt: new Date('2026-02-17T10:00:00.000Z'),
      updatedAt: new Date('2026-02-17T10:00:00.000Z'),
      empfaenger: [
        {
          id: generateValidBefehlId(),
          befehlId,
          name: 'ZF Nord',
          empfaengerId: generateValidUserId().value,
          zugestelltAm: null,
          quittiertAm: null,
          quittierungArt: null,
          createdAt: new Date('2026-02-17T10:00:00.000Z'),
        } as PrismaBefehlEmpfaenger & { name: string },
      ],
      kommentare: [],
      ...overrides,
    } as BefehlWithRelations;
  };

  describe('toDomain()', () => {
    it('should convert valid prisma record to domain aggregate', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl();

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then
      expect(befehl).toBeInstanceOf(Befehl);
      expect(befehl.id.value).toBe(prismaBefehl.id);
      expect(befehl.nummer).toBe('B-001');
      expect(befehl.einsatzId.value).toBe(prismaBefehl.einsatzId);
      expect(befehl.auftrag).toBe('Patientenablage einrichten');
      expect(befehl.befehlsgeberName).toBe('EL Müller');
      expect(befehl.befehlsgeberId?.value).toBe(prismaBefehl.befehlsgeberId);
      expect(befehl.erstellerId.value).toBe(prismaBefehl.erstellerId);
      expect(befehl.status.value).toBe('ERTEILT');
      expect(befehl.zeitvorgabe).toBe('15 min');
      expect(befehl.erteiltAm).toEqual(prismaBefehl.erteiltAm);
      expect(befehl.empfaenger).toHaveLength(1);
      expect(befehl.empfaenger[0].name).toBe('ZF Nord');
      expect(befehl.kommentare).toHaveLength(0);
    });

    it('should convert prisma record with nullable befehlsgeberId', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl({
        befehlsgeberId: null as unknown as string,
      });

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then
      expect(befehl.befehlsgeberName).toBe('EL Müller');
      expect(befehl.befehlsgeberId).toBeUndefined();
    });

    it('should convert prisma record with nullable empfaengerId', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl({
        empfaenger: [
          {
            id: generateValidBefehlId(),
            befehlId: generateValidBefehlId(),
            name: 'ZF Nord',
            empfaengerId: null,
            zugestelltAm: null,
            quittiertAm: null,
            quittierungArt: null,
            createdAt: new Date('2026-02-17T10:00:00.000Z'),
          } as PrismaBefehlEmpfaenger & { name: string },
        ],
      });

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then
      const emp = befehl.empfaenger[0];
      expect(emp.name).toBe('ZF Nord');
      expect(emp.empfaengerId).toBeUndefined();
    });

    it('should convert prisma record with EAMZW fields', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl({
        ereignis: 'Großbrand',
        mittel: '2x LF 20',
        ziel: 'Brand unter Kontrolle',
        weg: 'Über Nordseite anrücken',
      });

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then
      expect(befehl.ereignis).toBe('Großbrand');
      expect(befehl.mittel).toBe('2x LF 20');
      expect(befehl.ziel).toBe('Brand unter Kontrolle');
      expect(befehl.weg).toBe('Über Nordseite anrücken');
      expect(befehl.befehlstyp).toBe('EAMZW');
    });

    it('should convert prisma record with empfaenger zustellungs- and quittierungsdaten', () => {
      // Given
      const empfaengerId = generateValidUserId().value;
      const prismaBefehl = createValidPrismaBefehl({
        empfaenger: [
          {
            id: generateValidBefehlId(),
            befehlId: generateValidBefehlId(),
            name: 'ZF Nord',
            empfaengerId,
            zugestelltAm: new Date('2026-02-17T10:05:00.000Z'),
            quittiertAm: new Date('2026-02-17T10:06:00.000Z'),
            quittierungArt: 'VERSTANDEN',
            createdAt: new Date('2026-02-17T10:00:00.000Z'),
          } as PrismaBefehlEmpfaenger & { name: string },
        ],
      });

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then
      const emp = befehl.empfaenger[0];
      expect(emp.name).toBe('ZF Nord');
      expect(emp.empfaengerId?.value).toBe(empfaengerId);
      expect(emp.zugestelltAm).toEqual(new Date('2026-02-17T10:05:00.000Z'));
      expect(emp.quittiertAm).toEqual(new Date('2026-02-17T10:06:00.000Z'));
      expect(emp.quittierungArt).toBe('VERSTANDEN');
    });

    it('should convert prisma record with kommentare', () => {
      // Given
      const authorId = generateValidUserId().value;
      const prismaBefehl = createValidPrismaBefehl({
        kommentare: [
          {
            id: generateValidBefehlId(),
            befehlId: generateValidBefehlId(),
            authorId,
            text: 'Rückfrage: Welche Einsatzstelle?',
            isRueckfrage: true,
            parentId: null,
            createdAt: new Date('2026-02-17T10:10:00.000Z'),
          } as PrismaBefehlKommentar,
        ],
      });

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then
      expect(befehl.kommentare).toHaveLength(1);
      const kommentar = befehl.kommentare[0];
      expect(kommentar.authorId.value).toBe(authorId);
      expect(kommentar.text).toBe('Rückfrage: Welche Einsatzstelle?');
      expect(kommentar.isRueckfrage).toBe(true);
      expect(kommentar.parentId).toBeUndefined();
    });

    it('should convert prisma record with originalBefehlId', () => {
      // Given
      const originalId = generateValidBefehlId();
      const prismaBefehl = createValidPrismaBefehl({
        originalBefehlId: originalId,
        status: 'ERTEILT',
      });

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then
      expect(befehl.originalBefehlId).toBeDefined();
      expect(befehl.originalBefehlId!.value).toBe(originalId);
    });

    it('should not emit domain events on reconstitute via toDomain', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl();

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then — reconstitute() darf KEINE Events emittieren
      expect(befehl.getDomainEvents()).toHaveLength(0);
    });

    it('should preserve timestamps from database', () => {
      // Given
      const createdAt = new Date('2026-02-17T08:00:00.000Z');
      const updatedAt = new Date('2026-02-17T09:00:00.000Z');
      const prismaBefehl = createValidPrismaBefehl({ createdAt, updatedAt });

      // When
      const befehl = PrismaBefehlMapper.toDomain(prismaBefehl);

      // Then
      expect(befehl.createdAt).toEqual(createdAt);
      expect(befehl.updatedAt).toEqual(updatedAt);
    });

    it('should throw error for invalid befehl id', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl({ id: 'invalid!' });

      // When & Then
      expect(() => PrismaBefehlMapper.toDomain(prismaBefehl)).toThrow('Ungültige BefehlId');
    });

    it('should throw error for invalid einsatz id', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl({ einsatzId: 'invalid!' });

      // When & Then
      expect(() => PrismaBefehlMapper.toDomain(prismaBefehl)).toThrow('Ungültige EinsatzId');
    });

    it('should throw error for invalid status', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl({
        status: 'UNGUELTIG' as 'ERTEILT',
      });

      // When & Then
      expect(() => PrismaBefehlMapper.toDomain(prismaBefehl)).toThrow('Ungültiger BefehlStatus');
    });
  });

  describe('toPersistence()', () => {
    it('should convert domain aggregate to prisma-compatible data', () => {
      // Given
      const einsatzId = EinsatzId.create().value! as EinsatzId;

      const result = Befehl.create({
        einsatzId,
        auftrag: 'Patientenablage einrichten',
        befehlsgeber: 'EL Müller',
        erstellerId: generateValidUserId(),
        empfaenger: [{ name: 'ZF Nord' }],
        zeitvorgabe: '15 min',
        nummer: 'B-001',
      });
      const befehl = result.value!;

      // When
      const persistence = PrismaBefehlMapper.toPersistence(befehl);

      // Then
      expect(persistence.id).toBe(befehl.id.value);
      expect(persistence.nummer).toMatch(/^B-\d{3,}$/);
      expect(persistence.einsatzId).toBe(einsatzId.value);
      expect(persistence.auftrag).toBe('Patientenablage einrichten');
      expect(persistence.befehlsgeberName).toBe('EL Müller');
      expect(persistence.befehlsgeberId).toBeNull();
      expect(persistence.erstellerId).toBe(befehl.erstellerId.value);
      expect(persistence.status).toBe('ERTEILT');
      expect(persistence.zeitvorgabe).toBe('15 min');
      expect(persistence.ereignis).toBeNull();
      expect(persistence.mittel).toBeNull();
      expect(persistence.ziel).toBeNull();
      expect(persistence.weg).toBeNull();
      expect(persistence.originalBefehlId).toBeNull();
      expect(persistence.empfaenger).toHaveLength(1);
      expect(persistence.empfaenger[0].name).toBe('ZF Nord');
      // Funk-Empfaenger ohne empfaengerId: kein 'empfaenger' Relation-Connect
      expect(persistence.empfaenger[0]).not.toHaveProperty('empfaenger');
      expect(persistence.kommentare).toHaveLength(0);
    });

    it('should convert aggregate with EAMZW fields', () => {
      // Given
      const einsatzId = EinsatzId.create().value! as EinsatzId;
      const result = Befehl.create({
        einsatzId,
        auftrag: 'Brandbekämpfung',
        befehlsgeber: 'EL Test',
        erstellerId: generateValidUserId(),
        empfaenger: [{ name: 'ZF Nord' }],
        nummer: 'B-002',
        ereignis: 'Großbrand',
        mittel: '2x LF 20',
        ziel: 'Brand unter Kontrolle',
        weg: 'Über Nordseite',
      });
      const befehl = result.value!;

      // When
      const persistence = PrismaBefehlMapper.toPersistence(befehl);

      // Then
      expect(persistence.ereignis).toBe('Großbrand');
      expect(persistence.mittel).toBe('2x LF 20');
      expect(persistence.ziel).toBe('Brand unter Kontrolle');
      expect(persistence.weg).toBe('Über Nordseite');
    });
  });

  describe('Roundtrip (toDomain → toPersistence)', () => {
    it('should preserve all data through roundtrip conversion', () => {
      // Given
      const prismaBefehl = createValidPrismaBefehl({
        zeitvorgabe: '30 min',
        ereignis: 'Hochwasser',
        mittel: '3x GW-L',
        ziel: 'Sandsäcke verlegen',
        weg: 'Über die B3',
      });

      // When
      const domainAggregate = PrismaBefehlMapper.toDomain(prismaBefehl);
      const persistence = PrismaBefehlMapper.toPersistence(domainAggregate);

      // Then
      expect(persistence.id).toBe(prismaBefehl.id);
      expect(persistence.nummer).toBe(prismaBefehl.nummer);
      expect(persistence.einsatzId).toBe(prismaBefehl.einsatzId);
      expect(persistence.auftrag).toBe(prismaBefehl.auftrag);
      expect(persistence.befehlsgeberName).toBe('EL Müller');
      expect(persistence.befehlsgeberId).toBe(prismaBefehl.befehlsgeberId);
      expect(persistence.erstellerId).toBe(prismaBefehl.erstellerId);
      expect(persistence.status).toBe(prismaBefehl.status);
      expect(persistence.zeitvorgabe).toBe(prismaBefehl.zeitvorgabe);
      expect(persistence.ereignis).toBe(prismaBefehl.ereignis);
      expect(persistence.mittel).toBe(prismaBefehl.mittel);
      expect(persistence.ziel).toBe(prismaBefehl.ziel);
      expect(persistence.weg).toBe(prismaBefehl.weg);
      expect(persistence.erteiltAm).toEqual(prismaBefehl.erteiltAm);
      expect(persistence.empfaenger).toHaveLength(prismaBefehl.empfaenger.length);
      expect(persistence.empfaenger[0].name).toBe('ZF Nord');
    });
  });
});
