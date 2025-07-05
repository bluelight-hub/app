import { EtbAttachment } from '../etb-attachment.entity';

describe('EtbAttachment Entity', () => {
  describe('Constructor', () => {
    it('should create instance with empty partial object', () => {
      const attachment = new EtbAttachment({});

      expect(attachment).toBeInstanceOf(EtbAttachment);
      expect(attachment.id).toBeUndefined();
      expect(attachment.etbEntryId).toBeUndefined();
      expect(attachment.dateiname).toBeUndefined();
    });

    it('should create instance with partial data', () => {
      const partialData = {
        id: 'test-id',
        dateiname: 'test.pdf',
        dateityp: 'application/pdf',
      };

      const attachment = new EtbAttachment(partialData);

      expect(attachment.id).toBe('test-id');
      expect(attachment.dateiname).toBe('test.pdf');
      expect(attachment.dateityp).toBe('application/pdf');
      expect(attachment.etbEntryId).toBeUndefined();
    });

    it('should create instance with complete data', () => {
      const completeData = {
        id: 'att-123',
        etbEntryId: 'etb-456',
        dateiname: 'document.pdf',
        dateityp: 'application/pdf',
        speicherOrt: '/uploads/document.pdf',
        beschreibung: 'Important document',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      const attachment = new EtbAttachment(completeData);

      expect(attachment.id).toBe('att-123');
      expect(attachment.etbEntryId).toBe('etb-456');
      expect(attachment.dateiname).toBe('document.pdf');
      expect(attachment.dateityp).toBe('application/pdf');
      expect(attachment.speicherOrt).toBe('/uploads/document.pdf');
      expect(attachment.beschreibung).toBe('Important document');
      expect(attachment.createdAt).toEqual(new Date('2023-01-01'));
      expect(attachment.updatedAt).toEqual(new Date('2023-01-02'));
    });

    it('should handle null values', () => {
      const dataWithNulls = {
        id: 'test-id',
        beschreibung: null,
        dateiname: 'file.txt',
      };

      const attachment = new EtbAttachment(dataWithNulls);

      expect(attachment.id).toBe('test-id');
      expect(attachment.beschreibung).toBeNull();
      expect(attachment.dateiname).toBe('file.txt');
    });

    it('should override properties with Object.assign behavior', () => {
      const data = {
        id: 'original-id',
        dateiname: 'original.pdf',
      };

      const attachment = new EtbAttachment(data);

      // Verify Object.assign behavior
      expect(attachment.id).toBe('original-id');
      expect(attachment.dateiname).toBe('original.pdf');
      expect(Object.getOwnPropertyNames(attachment)).toContain('id');
      expect(Object.getOwnPropertyNames(attachment)).toContain('dateiname');
    });
  });

  describe('toPrisma', () => {
    it('should convert entity to prisma format with all properties', () => {
      const attachment = new EtbAttachment({
        id: 'att-789',
        etbEntryId: 'etb-123',
        dateiname: 'image.jpg',
        dateityp: 'image/jpeg',
        speicherOrt: '/uploads/image.jpg',
        beschreibung: 'Photo evidence',
        createdAt: new Date('2023-03-01'),
        updatedAt: new Date('2023-03-02'),
      });

      const prismaFormat = attachment.toPrisma();

      expect(prismaFormat).toEqual({
        id: 'att-789',
        etbEntryId: 'etb-123',
        dateiname: 'image.jpg',
        dateityp: 'image/jpeg',
        speicherOrt: '/uploads/image.jpg',
        beschreibung: 'Photo evidence',
        createdAt: new Date('2023-03-01'),
        updatedAt: new Date('2023-03-02'),
      });
    });

    it('should convert entity with null values', () => {
      const attachment = new EtbAttachment({
        id: 'att-null',
        etbEntryId: 'etb-null',
        dateiname: 'file.txt',
        dateityp: 'text/plain',
        speicherOrt: '/files/file.txt',
        beschreibung: null,
        createdAt: new Date('2023-04-01'),
        updatedAt: new Date('2023-04-01'),
      });

      const prismaFormat = attachment.toPrisma();

      expect(prismaFormat.beschreibung).toBeNull();
      expect(prismaFormat.id).toBe('att-null');
      expect(prismaFormat.dateiname).toBe('file.txt');
    });

    it('should convert entity with undefined values', () => {
      const attachment = new EtbAttachment({
        id: 'att-undefined',
        dateiname: 'test.doc',
      });

      const prismaFormat = attachment.toPrisma();

      expect(prismaFormat.id).toBe('att-undefined');
      expect(prismaFormat.dateiname).toBe('test.doc');
      expect(prismaFormat.etbEntryId).toBeUndefined();
      expect(prismaFormat.beschreibung).toBeUndefined();
    });

    it('should return object with expected structure', () => {
      const attachment = new EtbAttachment({
        id: 'structure-test',
        etbEntryId: 'etb-structure',
        dateiname: 'structure.pdf',
        dateityp: 'application/pdf',
        speicherOrt: '/structure.pdf',
        beschreibung: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const prismaFormat = attachment.toPrisma();
      const expectedKeys = [
        'id',
        'etbEntryId',
        'dateiname',
        'dateityp',
        'speicherOrt',
        'beschreibung',
        'createdAt',
        'updatedAt',
      ];

      expectedKeys.forEach((key) => {
        expect(prismaFormat).toHaveProperty(key);
      });

      expect(Object.keys(prismaFormat)).toHaveLength(expectedKeys.length);
    });
  });

  describe('fromPrisma (static method)', () => {
    it('should create entity from prisma object', () => {
      const prismaObj = {
        id: 'prisma-123',
        etbEntryId: 'etb-prisma',
        dateiname: 'prisma.pdf',
        dateityp: 'application/pdf',
        speicherOrt: '/prisma/prisma.pdf',
        beschreibung: 'From Prisma',
        createdAt: new Date('2023-05-01'),
        updatedAt: new Date('2023-05-02'),
      };

      const attachment = EtbAttachment.fromPrisma(prismaObj);

      expect(attachment).toBeInstanceOf(EtbAttachment);
      expect(attachment.id).toBe('prisma-123');
      expect(attachment.etbEntryId).toBe('etb-prisma');
      expect(attachment.dateiname).toBe('prisma.pdf');
      expect(attachment.dateityp).toBe('application/pdf');
      expect(attachment.speicherOrt).toBe('/prisma/prisma.pdf');
      expect(attachment.beschreibung).toBe('From Prisma');
      expect(attachment.createdAt).toEqual(new Date('2023-05-01'));
      expect(attachment.updatedAt).toEqual(new Date('2023-05-02'));
    });

    it('should handle prisma object with null values', () => {
      const prismaObj = {
        id: 'prisma-null',
        etbEntryId: 'etb-null',
        dateiname: 'null.txt',
        dateityp: 'text/plain',
        speicherOrt: '/null.txt',
        beschreibung: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const attachment = EtbAttachment.fromPrisma(prismaObj);

      expect(attachment.beschreibung).toBeNull();
      expect(attachment.id).toBe('prisma-null');
    });

    it('should handle empty prisma object', () => {
      const prismaObj = {};

      const attachment = EtbAttachment.fromPrisma(prismaObj);

      expect(attachment).toBeInstanceOf(EtbAttachment);
      expect(attachment.id).toBeUndefined();
      expect(attachment.etbEntryId).toBeUndefined();
    });

    it('should handle partial prisma object', () => {
      const prismaObj = {
        id: 'partial-123',
        dateiname: 'partial.jpg',
      };

      const attachment = EtbAttachment.fromPrisma(prismaObj);

      expect(attachment.id).toBe('partial-123');
      expect(attachment.dateiname).toBe('partial.jpg');
      expect(attachment.etbEntryId).toBeUndefined();
      expect(attachment.beschreibung).toBeUndefined();
    });

    it('should be a static method', () => {
      expect(typeof EtbAttachment.fromPrisma).toBe('function');
      expect(EtbAttachment.fromPrisma.name).toBe('fromPrisma');
    });

    it('should create different instances for different calls', () => {
      const prismaObj1 = { id: 'obj1', dateiname: 'file1.txt' };
      const prismaObj2 = { id: 'obj2', dateiname: 'file2.txt' };

      const attachment1 = EtbAttachment.fromPrisma(prismaObj1);
      const attachment2 = EtbAttachment.fromPrisma(prismaObj2);

      expect(attachment1).not.toBe(attachment2);
      expect(attachment1.id).toBe('obj1');
      expect(attachment2.id).toBe('obj2');
    });
  });

  describe('Integration - Roundtrip Conversion', () => {
    it('should maintain data integrity in fromPrisma -> toPrisma conversion', () => {
      const originalData = {
        id: 'roundtrip-123',
        etbEntryId: 'etb-roundtrip',
        dateiname: 'roundtrip.pdf',
        dateityp: 'application/pdf',
        speicherOrt: '/uploads/roundtrip.pdf',
        beschreibung: 'Roundtrip test',
        createdAt: new Date('2023-06-01T10:00:00Z'),
        updatedAt: new Date('2023-06-01T11:00:00Z'),
      };

      const attachment = EtbAttachment.fromPrisma(originalData);
      const convertedBack = attachment.toPrisma();

      expect(convertedBack).toEqual(originalData);
    });

    it('should handle roundtrip with null values', () => {
      const originalData = {
        id: 'roundtrip-null',
        etbEntryId: 'etb-roundtrip-null',
        dateiname: 'null-test.txt',
        dateityp: 'text/plain',
        speicherOrt: '/null-test.txt',
        beschreibung: null,
        createdAt: new Date('2023-07-01'),
        updatedAt: new Date('2023-07-01'),
      };

      const attachment = EtbAttachment.fromPrisma(originalData);
      const convertedBack = attachment.toPrisma();

      expect(convertedBack).toEqual(originalData);
      expect(convertedBack.beschreibung).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle constructor with complex nested objects', () => {
      const complexData = {
        id: 'complex-123',
        metadata: { extra: 'data' }, // Not part of entity schema
        dateiname: 'complex.json',
        nested: { deep: { value: 'test' } },
      };

      const attachment = new EtbAttachment(complexData);

      expect(attachment.id).toBe('complex-123');
      expect(attachment.dateiname).toBe('complex.json');
      expect(attachment['metadata']).toEqual({ extra: 'data' });
      expect(attachment['nested']).toEqual({ deep: { value: 'test' } });
    });

    it('should handle fromPrisma with undefined input', () => {
      const attachment = EtbAttachment.fromPrisma(undefined);

      expect(attachment).toBeInstanceOf(EtbAttachment);
    });

    it('should handle fromPrisma with null input', () => {
      const attachment = EtbAttachment.fromPrisma(null);

      expect(attachment).toBeInstanceOf(EtbAttachment);
    });
  });
});
