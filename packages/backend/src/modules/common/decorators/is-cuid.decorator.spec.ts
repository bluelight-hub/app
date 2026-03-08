// @ts-nocheck
import { createId } from '@paralleldrive/cuid2';
import { validate } from 'class-validator';
import { IsCuid, validateCuidFormat } from './is-cuid.decorator';

/**
 * Tests für IsCuid Decorator und validateCuidFormat Funktion.
 *
 * Diese Tests stellen sicher, dass das CUID2-Format korrekt validiert wird.
 * CUID2s werden von der Application Layer via `@paralleldrive/cuid2` generiert.
 */
describe('IsCuid Decorator', () => {
  // Test-DTO Klasse für Decorator-Tests
  class TestDto {
    @IsCuid()
    id!: string;
  }

  class TestDtoWithOptional {
    @IsCuid()
    id?: string;
  }

  describe('validateCuidFormat', () => {
    describe('Given valid CUID2 formats', () => {
      it.each([
        ['pf9902w6nvuidl428y92ssfc', 'typisches CUID2 aus Production'],
        ['kv1gtdtz71ez5k2j5808clxf', 'anderes gültiges CUID2'],
        ['spcfr38z2ev21fvde2xklrxk', 'CUID2 von Fahrzeug'],
        [createId(), 'dynamisch generiertes CUID2'],
      ])('should return true for %s (%s)', (value, _description) => {
        // When
        const result = validateCuidFormat(value);

        // Then
        expect(result).toBe(true);
      });
    });

    describe('Given invalid CUID2 formats', () => {
      it.each([
        ['ABC123', 'Großbuchstaben'],
        ['clw3H8x9y0000qwertyuiopas', 'enthält Großbuchstabe'],
        ['clw3h8x9y0000qwerty_iopas', 'enthält Unterstrich'],
        ['clw3h8x9y0000qwerty-iopas', 'enthält Bindestrich'],
        ['clw3h8x9y0000 wertyuiopas', 'enthält Leerzeichen'],
        ['', 'leerer String'],
        ['123456', 'nur Zahlen'],
      ])('should return false for "%s" (%s)', (value, _description) => {
        // When
        const result = validateCuidFormat(value);

        // Then
        expect(result).toBe(false);
      });
    });

    describe('Given null or undefined values', () => {
      it('should return true for null (validation delegated to @IsOptional)', () => {
        // When
        const result = validateCuidFormat(null);

        // Then
        expect(result).toBe(true);
      });

      it('should return true for undefined (validation delegated to @IsOptional)', () => {
        // When
        const result = validateCuidFormat(undefined);

        // Then
        expect(result).toBe(true);
      });
    });

    describe('Given non-string values', () => {
      it.each([
        [123, 'number'],
        [{}, 'object'],
        [[], 'array'],
        [true, 'boolean'],
      ])('should return false for %s (%s)', (value, _description) => {
        // When
        const result = validateCuidFormat(value);

        // Then
        expect(result).toBe(false);
      });
    });
  });

  describe('IsCuid Decorator with class-validator', () => {
    describe('Given valid CUID2', () => {
      it('should pass validation for a valid CUID2', async () => {
        // Given
        const dto = new TestDto();
        dto.id = 'pf9902w6nvuidl428y92ssfc'; // Echte CUID2 aus Production

        // When
        const errors = await validate(dto);

        // Then
        expect(errors).toHaveLength(0);
      });
    });

    describe('Given invalid CUID2', () => {
      it('should fail validation with descriptive error message', async () => {
        // Given
        const dto = new TestDto();
        dto.id = 'invalid-cuid';

        // When
        const errors = await validate(dto);

        // Then
        expect(errors).toHaveLength(1);
        expect(errors[0]?.constraints?.isCuid).toContain('gültige CUID2');
      });

      it('should fail validation for NanoID format (21 chars)', async () => {
        // Given - NanoID hat 21 Zeichen und andere Zeichensätze
        const dto = new TestDto();
        dto.id = 'V1StGXR8_Z5jdHi6B-myT'; // Typisches NanoID

        // When
        const errors = await validate(dto);

        // Then
        expect(errors).toHaveLength(1);
      });
    });

    describe('Given optional field', () => {
      it('should pass validation when optional field is undefined', async () => {
        // Given
        const dto = new TestDtoWithOptional();
        // id bleibt undefined

        // When
        const errors = await validate(dto);

        // Then
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('Regression Tests für Production CUID2-IDs', () => {
    /**
     * Diese Tests verwenden echte CUID2-IDs aus Production,
     * um sicherzustellen, dass existierende Daten korrekt validiert werden.
     */
    it.each([
      'pf9902w6nvuidl428y92ssfc', // Einsatz-ID
      'kv1gtdtz71ez5k2j5808clxf', // Person-ID
      'spcfr38z2ev21fvde2xklrxk', // Fahrzeug-ID
    ])('should accept production CUID2: %s', (productionId) => {
      // When
      const result = validateCuidFormat(productionId);

      // Then
      expect(result).toBe(true);
    });
  });
});
