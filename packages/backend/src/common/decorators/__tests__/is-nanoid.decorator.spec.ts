import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { IsNanoId } from '../is-nanoid.decorator';

/**
 * Test-DTO-Klasse für IsNanoId-Validator-Tests
 */
class TestDto {
  @IsNanoId()
  standardNanoId: string;

  @IsNanoId(undefined, 12)
  customLengthNanoId: string;

  @IsNanoId({ message: 'Custom error message' })
  customMessageNanoId: string;
}

describe('IsNanoId Decorator', () => {
  describe('Standard NanoID Validation (21 characters)', () => {
    it('should pass validation for valid NanoID', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 'V1StGXR8_Z5jdHi6B-myT',
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeUndefined();
    });

    it('should pass validation for valid NanoID with underscores and dashes', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 'V1StGXR8_Z5jdHi6B-my9', // Exactly 21 characters, valid NanoID format
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeUndefined();
    });

    it('should pass validation for null value', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: null,
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeUndefined();
    });

    it('should pass validation for undefined value', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: undefined,
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeUndefined();
    });

    it('should fail validation for non-string value', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 123,
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeDefined();
      expect(standardNanoIdError.constraints).toHaveProperty('isNanoId');
    });

    it('should fail validation for string with wrong length (too short)', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 'V1StGXR8_Z5jdHi6B', // 17 characters instead of 21
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeDefined();
      expect(standardNanoIdError.constraints).toHaveProperty('isNanoId');
    });

    it('should fail validation for string with wrong length (too long)', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 'V1StGXR8_Z5jdHi6B-myTXYZ', // 25 characters instead of 21
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeDefined();
      expect(standardNanoIdError.constraints).toHaveProperty('isNanoId');
    });

    it('should fail validation for string with invalid characters', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 'V1StGXR8!Z5jdHi6B@myT', // Contains ! and @
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeDefined();
      expect(standardNanoIdError.constraints).toHaveProperty('isNanoId');
    });

    it('should use default error message', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 'invalid',
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeDefined();
      expect(standardNanoIdError.constraints.isNanoId).toBe(
        'standardNanoId muss eine gültige NanoID sein (21 Zeichen, nur A-Za-z0-9_-)',
      );
    });
  });

  describe('Custom Length NanoID Validation (12 characters)', () => {
    it('should pass validation for valid 12-character NanoID', async () => {
      const dto = plainToClass(TestDto, {
        customLengthNanoId: 'V1StGXR8_Z5j',
      });

      const errors = await validate(dto);
      const customLengthNanoIdError = errors.find((e) => e.property === 'customLengthNanoId');

      expect(customLengthNanoIdError).toBeUndefined();
    });

    it('should fail validation for 12-character field with wrong length', async () => {
      const dto = plainToClass(TestDto, {
        customLengthNanoId: 'V1StGXR8_Z5jdHi6B-myT', // 21 characters instead of 12
      });

      const errors = await validate(dto);
      const customLengthNanoIdError = errors.find((e) => e.property === 'customLengthNanoId');

      expect(customLengthNanoIdError).toBeDefined();
      expect(customLengthNanoIdError.constraints.isNanoId).toBe(
        'customLengthNanoId muss eine gültige NanoID sein (12 Zeichen, nur A-Za-z0-9_-)',
      );
    });
  });

  describe('Custom Error Message', () => {
    it('should use custom error message when provided', async () => {
      const dto = plainToClass(TestDto, {
        customMessageNanoId: 'invalid',
      });

      const errors = await validate(dto);
      const customMessageNanoIdError = errors.find((e) => e.property === 'customMessageNanoId');

      expect(customMessageNanoIdError).toBeDefined();
      expect(customMessageNanoIdError.constraints.isNanoId).toBe('Custom error message');
    });
  });

  describe('Edge Cases', () => {
    it('should fail validation for empty string', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: '',
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeDefined();
      expect(standardNanoIdError.constraints).toHaveProperty('isNanoId');
    });

    it('should fail validation for string with spaces', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 'V1StGXR8 Z5jdHi6B myT', // Contains spaces
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeDefined();
      expect(standardNanoIdError.constraints).toHaveProperty('isNanoId');
    });

    it('should fail validation for string with special characters', async () => {
      const dto = plainToClass(TestDto, {
        standardNanoId: 'V1StGXR8+Z5jdHi6B=myT', // Contains + and =
      });

      const errors = await validate(dto);
      const standardNanoIdError = errors.find((e) => e.property === 'standardNanoId');

      expect(standardNanoIdError).toBeDefined();
      expect(standardNanoIdError.constraints).toHaveProperty('isNanoId');
    });
  });
});
