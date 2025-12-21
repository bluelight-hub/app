import { EinsatzPerson, type CreateEinsatzPersonFromStammProps, type CreateTemporaryEinsatzPersonProps, type ReconstituteEinsatzPersonProps } from '../einsatz-person.aggregate';
import { EINSATZ_PERSON_ERROR_CODES } from '../../common/einsatz-person-error-codes';
import { EinsatzPersonHinzugefuegtEvent } from '../../events/einsatz-person-hinzugefuegt.event';

describe('EinsatzPerson Aggregate', () => {
  const validCreatedBy = 'clw3h8x9y0000qwertyuiopas'; // Valid CUID2
  const validStammId = 'clw3h8x9y0000qwertyuiopzz'; // Valid CUID2 for StammPerson
  const validEinsatzId = 'e3b0c442-98fc-1c14-b39f-f8d9b3e1b5a2'; // Valid UUID for Einsatz
  const validQualifikationId = 'clw3h8x9y0000qwertyuiopyy'; // Valid CUID2 for Qualifikation

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFromStammPerson()', () => {
    describe('validation', () => {
      it('should fail when einsatzId is empty', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: '',
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('einsatzId ist erforderlich');
      });

      it('should fail when stammId is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: 'invalid-cuid',
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('stammId muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when vorname is empty', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: '',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Vorname ist erforderlich');
      });

      it('should fail when vorname is too long', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'A'.repeat(101), // 101 Zeichen (max: 100)
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Vorname darf maximal');
      });

      it('should fail when nachname is empty', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: '',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Nachname ist erforderlich');
      });

      it('should fail when nachname is too long', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'A'.repeat(101), // 101 Zeichen (max: 100)
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Nachname darf maximal');
      });

      it('should fail when funktion is empty', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: '',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funktion ist erforderlich');
      });

      it('should fail when funktion is too long', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'A'.repeat(51), // 51 Zeichen (max: 50)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funktion darf maximal');
      });

      it('should fail when createdBy is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: 'invalid-cuid',
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when qualifikationId is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          qualifikationIds: ['invalid-cuid'],
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.INVALID_QUALIFIKATION);
      });

      it('should fail when position has invalid coordinates', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
          position: { lat: 200, lng: 200 }, // Invalid coordinates
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_PERSON_ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('success cases', () => {
      it('should create EinsatzPerson with all required fields', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Rettungshelfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value!.einsatzId).toBe(validEinsatzId);
        expect(result.value!.stammId).toBe(validStammId);
        expect(result.value!.vorname).toBe('Max');
        expect(result.value!.nachname).toBe('Mustermann');
        expect(result.value!.funktion).toBe('Rettungshelfer');
        expect(result.value!.createdBy).toBe(validCreatedBy);
      });

      it('should create EinsatzPerson with optional fields', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Gruppenführer',
          funkrufname: 'Florian 1',
          qualifikationIds: [validQualifikationId],
          createdBy: validCreatedBy,
          position: { lat: 50.123, lng: 8.456 },
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value!.funkrufname).toBe('Florian 1');
        expect(result.value!.qualifikationIds).toContain(validQualifikationId);
        expect(result.value!.position).toBeDefined();
        expect(result.value!.position!.lat).toBe(50.123);
      });

      it('should emit EinsatzPersonHinzugefuegtEvent with stammId', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = result.value!.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(EinsatzPersonHinzugefuegtEvent);

        const event = events[0] as EinsatzPersonHinzugefuegtEvent;
        expect(event.einsatzId).toBe(validEinsatzId);
        expect(event.stammId).toBe(validStammId);
        expect(event.vorname).toBe('Max');
        expect(event.nachname).toBe('Mustermann');
        expect(event.funktion).toBe('Helfer');
        expect(event.registriertVon).toBe(validCreatedBy);
      });

      it('should trim whitespace from string fields', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: `  ${validEinsatzId}  `,
          stammId: `  ${validStammId}  `,
          vorname: '  Max  ',
          nachname: '  Mustermann  ',
          funktion: '  Helfer  ',
          funkrufname: '  Florian 1  ',
          createdBy: `  ${validCreatedBy}  `,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value!.vorname).toBe('Max');
        expect(result.value!.nachname).toBe('Mustermann');
        expect(result.value!.funktion).toBe('Helfer');
        expect(result.value!.funkrufname).toBe('Florian 1');
      });

      it('should convert empty funkrufname to undefined', () => {
        // Given (Arrange)
        const props: CreateEinsatzPersonFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          funkrufname: '   ', // Only whitespace
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createFromStammPerson(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value!.funkrufname).toBeUndefined();
      });
    });
  });

  describe('createTemporary()', () => {
    describe('validation', () => {
      it('should fail when einsatzId is empty', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzPersonProps = {
          einsatzId: '',
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('einsatzId ist erforderlich');
      });

      it('should fail when vorname is empty', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzPersonProps = {
          einsatzId: validEinsatzId,
          vorname: '',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Vorname ist erforderlich');
      });

      it('should fail when nachname is empty', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzPersonProps = {
          einsatzId: validEinsatzId,
          vorname: 'Max',
          nachname: '',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Nachname ist erforderlich');
      });

      it('should fail when funktion is empty', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzPersonProps = {
          einsatzId: validEinsatzId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: '',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funktion ist erforderlich');
      });

      it('should fail when createdBy is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzPersonProps = {
          einsatzId: validEinsatzId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: 'invalid-cuid',
        };

        // When (Act)
        const result = EinsatzPerson.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy muss ein gültiger CUID2-Identifier sein');
      });
    });

    describe('success cases', () => {
      it('should create temporary EinsatzPerson without stammId', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzPersonProps = {
          einsatzId: validEinsatzId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value!.stammId).toBeUndefined();
        expect(result.value!.vorname).toBe('Max');
        expect(result.value!.nachname).toBe('Mustermann');
        expect(result.value!.funktion).toBe('Helfer');
      });

      it('should emit EinsatzPersonHinzugefuegtEvent with stammId undefined', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzPersonProps = {
          einsatzId: validEinsatzId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = result.value!.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(EinsatzPersonHinzugefuegtEvent);

        const event = events[0] as EinsatzPersonHinzugefuegtEvent;
        expect(event.stammId).toBeUndefined();
        expect(event.vorname).toBe('Max');
        expect(event.nachname).toBe('Mustermann');
      });

      it('should create temporary EinsatzPerson with optional qualifikationen', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzPersonProps = {
          einsatzId: validEinsatzId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Rettungssanitäter',
          qualifikationIds: [validQualifikationId],
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzPerson.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value!.qualifikationIds).toContain(validQualifikationId);
      });
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute EinsatzPerson from DB data', () => {
      // Given (Arrange)
      const props: ReconstituteEinsatzPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopxx',
        einsatzId: validEinsatzId,
        stammId: validStammId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Gruppenführer',
        funkrufname: 'Florian 1',
        qualifikationIds: [validQualifikationId],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        createdBy: validCreatedBy,
        updatedBy: validCreatedBy,
      };

      // When (Act)
      const result = EinsatzPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.id.value).toBe('clw3h8x9y0000qwertyuiopxx');
      expect(result.value!.einsatzId).toBe(validEinsatzId);
      expect(result.value!.stammId).toBe(validStammId);
      expect(result.value!.vorname).toBe('Max');
      expect(result.value!.nachname).toBe('Mustermann');
      expect(result.value!.funktion).toBe('Gruppenführer');
      expect(result.value!.funkrufname).toBe('Florian 1');
      expect(result.value!.qualifikationIds).toContain(validQualifikationId);
      expect(result.value!.createdBy).toBe(validCreatedBy);
      expect(result.value!.updatedBy).toBe(validCreatedBy);
    });

    it('should reconstitute EinsatzPerson without stammId (temporary)', () => {
      // Given (Arrange)
      const props: ReconstituteEinsatzPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopxx',
        einsatzId: validEinsatzId,
        stammId: undefined,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: [],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        createdBy: validCreatedBy,
      };

      // When (Act)
      const result = EinsatzPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.stammId).toBeUndefined();
    });

    it('should NOT emit domain events on reconstitution', () => {
      // Given (Arrange)
      const props: ReconstituteEinsatzPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopxx',
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: [],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        createdBy: validCreatedBy,
      };

      // When (Act)
      const result = EinsatzPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = result.value!.getDomainEvents();
      expect(events).toHaveLength(0);
    });

    it('should reconstitute with position', () => {
      // Given (Arrange)
      const props: ReconstituteEinsatzPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopxx',
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: [],
        position: { lat: 50.123, lng: 8.456 },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        createdBy: validCreatedBy,
      };

      // When (Act)
      const result = EinsatzPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.position).toBeDefined();
      expect(result.value!.position!.lat).toBe(50.123);
      expect(result.value!.position!.lng).toBe(8.456);
    });

    it('should fail when id is invalid', () => {
      // Given (Arrange)
      const props: ReconstituteEinsatzPersonProps = {
        id: 'invalid-id',
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: [],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        createdBy: validCreatedBy,
      };

      // When (Act)
      const result = EinsatzPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige ID');
    });
  });

  describe('getters', () => {
    it('should return immutable qualifikationIds array (mutation-safe)', () => {
      // Given (Arrange)
      const props: CreateEinsatzPersonFromStammProps = {
        einsatzId: validEinsatzId,
        stammId: validStammId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: [validQualifikationId],
        createdBy: validCreatedBy,
      };
      const result = EinsatzPerson.createFromStammPerson(props);
      expect(result.isSuccess).toBe(true);
      const person = result.value!;

      // When (Act)
      const qualifikationen = person.qualifikationIds;
      qualifikationen.push('clw3h8x9y0000qwertyuiopww'); // Try to mutate

      // Then (Assert)
      expect(person.qualifikationIds).toHaveLength(1); // Original unchanged
      expect(person.qualifikationIds).toContain(validQualifikationId);
    });
  });

  describe('assignToFahrzeug()', () => {
    const validFahrzeugId = 'clw3h8x9y0000qwertyuiopff'; // Valid CUID2 for Fahrzeug
    const validUpdatedBy = 'clw3h8x9y0000qwertyuiopuu'; // Valid CUID2

    function createValidPerson(): EinsatzPerson {
      const result = EinsatzPerson.createFromStammPerson({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        createdBy: validCreatedBy,
      });
      expect(result.isSuccess).toBe(true);
      const person = result.value!;
      person.clearDomainEvents(); // Clear creation event
      return person;
    }

    describe('validation', () => {
      it('should fail when fahrzeugId is empty', () => {
        // Given (Arrange)
        const person = createValidPerson();

        // When (Act)
        const result = person.assignToFahrzeug('', 'LF 10/1', validUpdatedBy);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('fahrzeugId muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when fahrzeugId is not a valid CUID', () => {
        // Given (Arrange)
        const person = createValidPerson();

        // When (Act)
        const result = person.assignToFahrzeug('invalid-cuid', 'LF 10/1', validUpdatedBy);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('fahrzeugId muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when fahrzeugFunkrufname is empty (BLOCKER Fix)', () => {
        // Given (Arrange)
        const person = createValidPerson();

        // When (Act)
        const result = person.assignToFahrzeug(validFahrzeugId, '', validUpdatedBy);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('fahrzeugFunkrufname ist erforderlich');
      });

      it('should fail when fahrzeugFunkrufname is whitespace only (BLOCKER Fix)', () => {
        // Given (Arrange)
        const person = createValidPerson();

        // When (Act)
        const result = person.assignToFahrzeug(validFahrzeugId, '   ', validUpdatedBy);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('fahrzeugFunkrufname ist erforderlich');
      });

      it('should fail when updatedBy is empty', () => {
        // Given (Arrange)
        const person = createValidPerson();

        // When (Act)
        const result = person.assignToFahrzeug(validFahrzeugId, 'LF 10/1', '');

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when updatedBy is not a valid CUID', () => {
        // Given (Arrange)
        const person = createValidPerson();

        // When (Act)
        const result = person.assignToFahrzeug(validFahrzeugId, 'LF 10/1', 'invalid-cuid');

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
      });
    });

    describe('success cases', () => {
      it('should assign person to fahrzeug successfully', () => {
        // Given (Arrange)
        const person = createValidPerson();
        expect(person.fahrzeugId).toBeUndefined();

        // When (Act)
        const result = person.assignToFahrzeug(validFahrzeugId, 'LF 10/1', validUpdatedBy);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(person.fahrzeugId).toBe(validFahrzeugId);
        expect(person.updatedBy).toBe(validUpdatedBy);
      });

      it('should emit PersonZuFahrzeugZugewiesenEvent', () => {
        // Given (Arrange)
        const person = createValidPerson();

        // When (Act)
        const result = person.assignToFahrzeug(validFahrzeugId, 'LF 10/1', validUpdatedBy);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = person.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('PersonZuFahrzeugZugewiesenEvent');
      });

      it('should trim fahrzeugFunkrufname in event', () => {
        // Given (Arrange)
        const person = createValidPerson();

        // When (Act)
        const result = person.assignToFahrzeug(validFahrzeugId, '  LF 10/1  ', validUpdatedBy);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = person.getDomainEvents();
        const event = events[0] as { fahrzeugFunkrufname: string };
        expect(event.fahrzeugFunkrufname).toBe('LF 10/1');
      });
    });

    describe('idempotency', () => {
      it('should NOT emit event when assigning to same fahrzeug (idempotent)', () => {
        // Given (Arrange)
        const person = createValidPerson();
        person.assignToFahrzeug(validFahrzeugId, 'LF 10/1', validUpdatedBy);
        person.clearDomainEvents();

        // When (Act)
        const result = person.assignToFahrzeug(validFahrzeugId, 'LF 10/1', validUpdatedBy);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(person.getDomainEvents()).toHaveLength(0);
      });

      it('should emit event when reassigning to different fahrzeug', () => {
        // Given (Arrange)
        const person = createValidPerson();
        const otherFahrzeugId = 'clw3h8x9y0000qwertyuiopgg';
        person.assignToFahrzeug(validFahrzeugId, 'LF 10/1', validUpdatedBy);
        person.clearDomainEvents();

        // When (Act)
        const result = person.assignToFahrzeug(otherFahrzeugId, 'TLF 16/25', validUpdatedBy);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(person.fahrzeugId).toBe(otherFahrzeugId);
        expect(person.getDomainEvents()).toHaveLength(1);
      });
    });
  });

  describe('removeFromFahrzeug()', () => {
    const validFahrzeugId = 'clw3h8x9y0000qwertyuiopff';
    const validUpdatedBy = 'clw3h8x9y0000qwertyuiopuu';

    function createPersonWithFahrzeug(): EinsatzPerson {
      const result = EinsatzPerson.createFromStammPerson({
        einsatzId: validEinsatzId,
        stammId: validStammId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        createdBy: validCreatedBy,
      });
      expect(result.isSuccess).toBe(true);
      const person = result.value!;
      person.assignToFahrzeug(validFahrzeugId, 'LF 10/1', validUpdatedBy);
      person.clearDomainEvents();
      return person;
    }

    describe('validation', () => {
      it('should fail when updatedBy is empty', () => {
        // Given (Arrange)
        const person = createPersonWithFahrzeug();

        // When (Act)
        const result = person.removeFromFahrzeug('LF 10/1', '');

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when updatedBy is not a valid CUID', () => {
        // Given (Arrange)
        const person = createPersonWithFahrzeug();

        // When (Act)
        const result = person.removeFromFahrzeug('LF 10/1', 'invalid-cuid');

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
      });
    });

    describe('success cases', () => {
      it('should remove person from fahrzeug successfully', () => {
        // Given (Arrange)
        const person = createPersonWithFahrzeug();
        expect(person.fahrzeugId).toBe(validFahrzeugId);

        // When (Act)
        const result = person.removeFromFahrzeug('LF 10/1', validUpdatedBy);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(person.fahrzeugId).toBeUndefined();
        expect(person.updatedBy).toBe(validUpdatedBy);
      });

      it('should emit PersonVonFahrzeugEntferntEvent', () => {
        // Given (Arrange)
        const person = createPersonWithFahrzeug();

        // When (Act)
        const result = person.removeFromFahrzeug('LF 10/1', validUpdatedBy);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = person.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0].constructor.name).toBe('PersonVonFahrzeugEntferntEvent');
      });
    });

    describe('idempotency', () => {
      it('should NOT emit event when no fahrzeug assigned (idempotent)', () => {
        // Given (Arrange)
        const result = EinsatzPerson.createFromStammPerson({
          einsatzId: validEinsatzId,
          stammId: validStammId,
          vorname: 'Max',
          nachname: 'Mustermann',
          funktion: 'Helfer',
          createdBy: validCreatedBy,
        });
        const person = result.value!;
        person.clearDomainEvents();

        // When (Act)
        const removeResult = person.removeFromFahrzeug('LF 10/1', validUpdatedBy);

        // Then (Assert)
        expect(removeResult.isSuccess).toBe(true);
        expect(person.getDomainEvents()).toHaveLength(0);
      });
    });
  });

  describe('domain events', () => {
    it('should clear domain events after getDomainEvents and clearDomainEvents', () => {
      // Given (Arrange)
      const props: CreateEinsatzPersonFromStammProps = {
        einsatzId: validEinsatzId,
        stammId: validStammId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        createdBy: validCreatedBy,
      };
      const result = EinsatzPerson.createFromStammPerson(props);
      expect(result.isSuccess).toBe(true);
      const person = result.value!;

      // When (Act)
      expect(person.getDomainEvents()).toHaveLength(1);
      person.clearDomainEvents();

      // Then (Assert)
      expect(person.getDomainEvents()).toHaveLength(0);
    });
  });
});
