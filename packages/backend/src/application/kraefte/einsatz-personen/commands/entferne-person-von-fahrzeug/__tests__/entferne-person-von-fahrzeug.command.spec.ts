import { createId } from '@paralleldrive/cuid2';
import { EntfernePersonVonFahrzeugCommand } from '../entferne-person-von-fahrzeug.command';

describe('EntfernePersonVonFahrzeugCommand', () => {
  // Test Data
  const validEinsatzId = '123e4567-e89b-12d3-a456-426614174000';
  const validPersonId = createId();
  const validUpdatedBy = createId();

  describe('validation', () => {
    it('should fail when einsatzId is empty', () => {
      // Given (Arrange)
      const props = {
        einsatzId: '',
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = EntfernePersonVonFahrzeugCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });

    it('should fail when einsatzId is whitespace only', () => {
      // Given (Arrange)
      const props = {
        einsatzId: '   ',
        personId: validPersonId,
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = EntfernePersonVonFahrzeugCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });

    it('should fail when personId is empty', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: '',
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = EntfernePersonVonFahrzeugCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('personId muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when personId is not a valid CUID', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: 'invalid-cuid',
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = EntfernePersonVonFahrzeugCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('personId muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when updatedBy is empty', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: '',
      };

      // When (Act)
      const result = EntfernePersonVonFahrzeugCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
    });

    it('should fail when updatedBy is not a valid CUID', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        personId: validPersonId,
        updatedBy: 'not-a-valid-cuid-format-12345',
      };

      // When (Act)
      const result = EntfernePersonVonFahrzeugCommand.create(props);

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
        updatedBy: validUpdatedBy,
      };

      // When (Act)
      const result = EntfernePersonVonFahrzeugCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.einsatzId).toBe(validEinsatzId);
      expect(result.value!.personId).toBe(validPersonId);
      expect(result.value!.updatedBy).toBe(validUpdatedBy);
    });

    it('should trim whitespace from all fields', () => {
      // Given (Arrange)
      const props = {
        einsatzId: `  ${validEinsatzId}  `,
        personId: `  ${validPersonId}  `,
        updatedBy: `  ${validUpdatedBy}  `,
      };

      // When (Act)
      const result = EntfernePersonVonFahrzeugCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.einsatzId).toBe(validEinsatzId);
      expect(result.value!.personId).toBe(validPersonId);
      expect(result.value!.updatedBy).toBe(validUpdatedBy);
    });
  });
});
