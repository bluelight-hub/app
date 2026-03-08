// @ts-nocheck
import { GetTaktischeStaerkeQuery } from '../get-taktische-staerke.query';

describe('GetTaktischeStaerkeQuery', () => {
  describe('Factory Method', () => {
    it('should create query with valid einsatzId', () => {
      // Given
      const einsatzId = 'test-einsatz-123';

      // When
      const result = GetTaktischeStaerkeQuery.create(einsatzId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzId).toBe(einsatzId);
    });

    it('should trim einsatzId', () => {
      // Given
      const einsatzId = '  test-einsatz-123  ';

      // When
      const result = GetTaktischeStaerkeQuery.create(einsatzId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzId).toBe('test-einsatz-123');
    });

    it('should fail with empty einsatzId', () => {
      // Given
      const einsatzId = '';

      // When
      const result = GetTaktischeStaerkeQuery.create(einsatzId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('erforderlich');
    });

    it('should fail with whitespace-only einsatzId', () => {
      // Given
      const einsatzId = '   ';

      // When
      const result = GetTaktischeStaerkeQuery.create(einsatzId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('erforderlich');
    });

    it('should fail with null einsatzId', () => {
      // Given
      const einsatzId = null as unknown as string;

      // When
      const result = GetTaktischeStaerkeQuery.create(einsatzId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('erforderlich');
    });

    it('should fail with undefined einsatzId', () => {
      // Given
      const einsatzId = undefined as unknown as string;

      // When
      const result = GetTaktischeStaerkeQuery.create(einsatzId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('erforderlich');
    });
  });
});
