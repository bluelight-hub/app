// @ts-nocheck
import { createId } from '@paralleldrive/cuid2';
import { WeisePersonZuFahrzeugZuCommand } from '../weise-person-zu-fahrzeug.command';

describe('WeisePersonZuFahrzeugZuCommand', () => {
  // Test Data
  const validEinsatzId = createId();
  const validPersonId = createId();
  const validFahrzeugId = createId();
  const validUpdatedBy = createId();

  describe('validation', () => {
    it('should fail when einsatzId is empty', () => {
      // Given (Arrange)
      const props = {
        einsatzId: '',
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when einsatzId is whitespace only', () => {
      // Given (Arrange)
      const props = {
        einsatzId: '   ',
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when personId is empty', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: '',
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('personId muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when personId is not a valid CUID', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: 'invalid-cuid',
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('personId muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when fahrzeugId is empty', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: '',
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('fahrzeugId muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when fahrzeugId is not a valid CUID', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: 'not-a-cuid',
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('fahrzeugId muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when updatedBy is empty', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: '',
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when updatedBy is not a valid CUID', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: 'not-a-valid-cuid-format-12345',
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
    });
  });

  describe('success cases', () => {
    it('should create command with valid inputs', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: validPersonId,
        fahrzeugId: validFahrzeugId,
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.einsatzId).toBe(validEinsatzId);
      expect(result.value?.personId).toBe(validPersonId);
      expect(result.value?.fahrzeugId).toBe(validFahrzeugId);
      expect(result.value?.updatedBy).toBe(validUpdatedBy);
    });

    it('should trim whitespace from all fields', () => {
      // Given (Arrange)
      const props = {
        einsatzId: `  ${validEinsatzId}  `,
        personId: `  ${validPersonId}  `,
        fahrzeugId: `  ${validFahrzeugId}  `,
        updatedBy: `  ${validUpdatedBy}  `,
      };

      // When (Act)
      const result = WeisePersonZuFahrzeugZuCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzId).toBe(validEinsatzId);
      expect(result.value?.personId).toBe(validPersonId);
      expect(result.value?.fahrzeugId).toBe(validFahrzeugId);
      expect(result.value?.updatedBy).toBe(validUpdatedBy);
    });
  });
});
