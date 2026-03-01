import { createId } from '@paralleldrive/cuid2';
import { BesetzeRolleCommand } from '../besetze-rolle.command';

describe('BesetzeRolleCommand', () => {
  // Valid test fixtures
  const validEinsatzId = createId();
  const validEinsatzPersonId = createId();
  const validRollenDefinitionId = createId();
  const validBesetztVon = createId();

  const createValidProps = () => ({
    einsatzId: validEinsatzId,
    einsatzPersonId: validEinsatzPersonId,
    rollenDefinitionId: validRollenDefinitionId,
    besetztVon: validBesetztVon,
  });

  describe('create - Success Cases', () => {
    it('sollte Command mit allen validen Feldern erstellen', () => {
      // Given (Arrange)
      const props = createValidProps();

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.einsatzId).toBe(validEinsatzId);
      expect(result.value?.einsatzPersonId).toBe(validEinsatzPersonId);
      expect(result.value?.rollenDefinitionId).toBe(validRollenDefinitionId);
      expect(result.value?.besetztVon).toBe(validBesetztVon);
    });

    it('sollte Whitespace in IDs trimmen', () => {
      // Given (Arrange)
      const props = {
        einsatzId: `  ${validEinsatzId}  `,
        einsatzPersonId: `  ${validEinsatzPersonId}  `,
        rollenDefinitionId: `  ${validRollenDefinitionId}  `,
        besetztVon: `  ${validBesetztVon}  `,
      };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzId).toBe(validEinsatzId);
      expect(result.value?.einsatzPersonId).toBe(validEinsatzPersonId);
    });
  });

  describe('create - einsatzId Validation', () => {
    it('sollte fehlschlagen wenn einsatzId leer ist', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), einsatzId: '' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });

    it('sollte fehlschlagen wenn einsatzId nur Whitespace enthält', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), einsatzId: '   ' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });

    it('sollte fehlschlagen wenn einsatzId kein gültiger CUID2 ist', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), einsatzId: 'invalid-id' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen wenn einsatzId eine UUID ist', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), einsatzId: '123e4567-e89b-12d3-a456-426614174000' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId muss ein gültiger CUID2-Identifier sein');
    });
  });

  describe('create - einsatzPersonId Validation', () => {
    it('sollte fehlschlagen wenn einsatzPersonId leer ist', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), einsatzPersonId: '' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzPersonId ist erforderlich');
    });

    it('sollte fehlschlagen wenn einsatzPersonId kein gültiger CUID2 ist', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), einsatzPersonId: 'not-a-cuid' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzPersonId muss ein gültiger CUID2-Identifier sein');
    });
  });

  describe('create - rollenDefinitionId Validation', () => {
    it('sollte fehlschlagen wenn rollenDefinitionId leer ist', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), rollenDefinitionId: '' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('rollenDefinitionId ist erforderlich');
    });

    it('sollte fehlschlagen wenn rollenDefinitionId kein gültiger CUID2 ist', () => {
      // Given (Arrange)
      // Hinweis: abc123 wird von isCuid() als gültig erkannt, daher kürzere ungültige ID
      const props = { ...createValidProps(), rollenDefinitionId: 'x' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('rollenDefinitionId muss ein gültiger CUID2-Identifier sein');
    });
  });

  describe('create - besetztVon Validation', () => {
    it('sollte fehlschlagen wenn besetztVon leer ist', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), besetztVon: '' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('besetztVon ist erforderlich');
    });

    it('sollte fehlschlagen wenn besetztVon kein gültiger CUID2 ist', () => {
      // Given (Arrange)
      const props = { ...createValidProps(), besetztVon: 'user@example.com' };

      // When (Act)
      const result = BesetzeRolleCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('besetztVon muss ein gültiger CUID2-Identifier sein');
    });
  });

  describe('Immutability', () => {
    it('sollte readonly Properties haben', () => {
      // Given (Arrange)
      const props = createValidProps();
      const command = BesetzeRolleCommand.create(props).value!;

      // Then (Assert) - TypeScript enforces readonly at compile time
      expect(command.einsatzId).toBe(validEinsatzId);
      expect(command.einsatzPersonId).toBe(validEinsatzPersonId);
      expect(command.rollenDefinitionId).toBe(validRollenDefinitionId);
      expect(command.besetztVon).toBe(validBesetztVon);
    });
  });
});
