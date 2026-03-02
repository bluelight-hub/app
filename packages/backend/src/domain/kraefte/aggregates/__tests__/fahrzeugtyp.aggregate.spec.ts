import { Fahrzeugtyp, type CreateFahrzeugtypProps, type UpdateFahrzeugtypProps, type ReconstituteFahrzeugtypProps } from '../fahrzeugtyp.aggregate';
import { FAHRZEUGTYP_ERROR_CODES } from '../../common/fahrzeugtyp-error-codes';
import { FahrzeugtypCreatedEvent } from '../../events/fahrzeugtyp-created.event';
import { FahrzeugtypUpdatedEvent } from '../../events/fahrzeugtyp-updated.event';

describe('Fahrzeugtyp Aggregate', () => {
  const validCreatedBy = 'clw3h8x9y0000qwertyuiopas'; // Valid CUID2

  // AI-R8 [HIGH]: Add beforeEach() with jest.clearAllMocks()
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    describe('validation', () => {
      it('should fail when code is too short', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'A', // Nur 1 Zeichen (min: 2)
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Code muss mindestens 2 Zeichen haben');
      });

      it('should fail when code is too long', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'ABCDEFGHIJK', // 11 Zeichen (max: 10)
          bezeichnung: 'Test Fahrzeug',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Code darf maximal 10 Zeichen haben');
      });

      it('should fail when bezeichnung is too short', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'KTW',
          bezeichnung: 'AB', // Nur 2 Zeichen (min: 3)
          kategorie: 'TRANSPORT',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Bezeichnung muss mindestens 3 Zeichen haben');
      });

      it('should fail when kategorie is invalid', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'RTW',
          bezeichnung: 'Rettungswagen',
          kategorie: 'INVALID_CATEGORY', // Nicht im ENUM
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Ungültige Kategorie');
      });

      it('should fail when sollbesatzung has negative values', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'NEF',
          bezeichnung: 'Notarzteinsatzfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          sollbesatzung: {
            fahrer: 1,
            notarzt: -1, // Negativ (ungültig)
          },
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Sollbesatzung.notarzt muss >= 0 sein');
      });

      it('should fail when sollbesatzung has non-integer values', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'LF',
          bezeichnung: 'Löschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          sollbesatzung: {
            fahrer: 1.5, // Float statt Integer
          },
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Sollbesatzung.fahrer muss eine ganze Zahl sein');
      });

      // AI-R10 [MEDIUM]: Add test: Infinity in Sollbesatzung
      it('should fail when sollbesatzung has Infinity values', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'TLF',
          bezeichnung: 'Tanklöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          sollbesatzung: {
            fahrer: Number.POSITIVE_INFINITY, // Infinity (ungültig)
          },
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Sollbesatzung.fahrer muss eine ganze Zahl sein');
      });

      it('should allow sollbesatzung with undefined optional fields', () => {
        // Given (Arrange) - entspricht DTO/Class-Instanz-Verhalten mit optionalen undefined-Feldern
        const props: CreateFahrzeugtypProps = {
          code: 'NEF',
          bezeichnung: 'Notarzteinsatzfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          sollbesatzung: {
            fahrer: 1,
            sanitaeter: undefined,
            notarzt: undefined,
            funktrupp: undefined,
            helfer: undefined,
          },
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
      });

      it('should fail when createdBy is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'DLK',
          bezeichnung: 'Drehleiter',
          kategorie: 'FUEHRUNG',
          createdBy: 'invalid-cuid',
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy muss ein gültiger CUID2-Identifier sein');
      });
    });

    describe('success', () => {
      it('should create fahrzeugtyp successfully with valid data', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'hlf', // Wird auf "HLF" normalisiert
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          beschreibung: 'Standard-Löschfahrzeug mit erweiterter Ausstattung',
          sollbesatzung: {
            fahrer: 1,
            funktrupp: 5,
          },
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value?.code).toBe('HLF'); // Code ist UPPERCASE normalisiert
        expect(result.value?.bezeichnung).toBe('Hilfeleistungslöschfahrzeug');
        expect(result.value?.kategorieValue).toBe('RETTUNGSDIENST');
        expect(result.value?.beschreibung).toBe('Standard-Löschfahrzeug mit erweiterter Ausstattung');
        expect(result.value?.sollbesatzung).toEqual({ fahrer: 1, funktrupp: 5 });
        expect(result.value?.istAktiv).toBe(true);
        expect(result.value?.sortOrder).toBe(0);
        expect(result.value?.createdBy).toBe(validCreatedBy);
      });

      it('should normalize code to UPPERCASE', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: '  mtw  ', // Whitespace + lowercase
          bezeichnung: 'Mannschaftstransportwagen',
          kategorie: 'TRANSPORT',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.code).toBe('MTW'); // Trimmed + UPPERCASE
      });

      it('should create fahrzeugtyp without optional fields', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'MTW',
          bezeichnung: 'Mannschaftstransportwagen',
          kategorie: 'TRANSPORT',
          createdBy: validCreatedBy,
          // Keine beschreibung, sollbesatzung
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBeUndefined();
        expect(result.value?.sollbesatzung).toBeUndefined();
      });

      // AI-R19 [LOW]: Add test for empty sollbesatzung object {}
      it('should create fahrzeugtyp with empty sollbesatzung object', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'GW',
          bezeichnung: 'Gerätewagen',
          kategorie: 'FUEHRUNG',
          sollbesatzung: {}, // Leeres Objekt ist valide
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.sollbesatzung).toEqual({});
      });
    });

    describe('domain events', () => {
      // AI-R16 [MEDIUM]: Add Domain Events emission tests
      it('should emit FahrzeugtypCreatedEvent on successful creation', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'hlf',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const fahrzeugtyp = result.value!;
        const events = fahrzeugtyp.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(FahrzeugtypCreatedEvent);

        const event = events[0] as FahrzeugtypCreatedEvent;
        expect(event.fahrzeugtypId).toBe(fahrzeugtyp.id.value);
        expect(event.code).toBe('HLF'); // Normalisiert
        expect(event.bezeichnung).toBe('Hilfeleistungslöschfahrzeug');
        expect(event.kategorie).toBe('RETTUNGSDIENST');
        expect(event.createdBy).toBe(validCreatedBy);
      });

      it('should not emit event when creation fails', () => {
        // Given (Arrange)
        const props: CreateFahrzeugtypProps = {
          code: 'A', // Ungültig (zu kurz)
          bezeichnung: 'Test',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.value).toBeUndefined();
      });
    });
  });

  describe('update()', () => {
    describe('success', () => {
      it('should update fahrzeugtyp successfully', () => {
        // Given (Arrange)
        const createProps: CreateFahrzeugtypProps = {
          code: 'HLF',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };
        const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;

        const updateProps: UpdateFahrzeugtypProps = {
          bezeichnung: 'HLF 20/16',
          beschreibung: 'Aktualisierte Beschreibung',
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = fahrzeugtyp.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(fahrzeugtyp.bezeichnung).toBe('HLF 20/16');
        expect(fahrzeugtyp.beschreibung).toBe('Aktualisierte Beschreibung');
        expect(fahrzeugtyp.updatedBy).toBe(validCreatedBy);
      });

      it('should normalize code to UPPERCASE on update', () => {
        // Given (Arrange)
        const createProps: CreateFahrzeugtypProps = {
          code: 'LF',
          bezeichnung: 'Löschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };
        const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;

        const updateProps: UpdateFahrzeugtypProps = {
          code: '  lf10  ', // Whitespace + lowercase
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = fahrzeugtyp.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(fahrzeugtyp.code).toBe('LF10'); // Trimmed + UPPERCASE
      });
    });

    describe('validation', () => {
      it('should validate sortOrder on update', () => {
        // Given (Arrange)
        const createProps: CreateFahrzeugtypProps = {
          code: 'MTW',
          bezeichnung: 'Mannschaftstransportwagen',
          kategorie: 'TRANSPORT',
          createdBy: validCreatedBy,
        };
        const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;

        // When (Act) - Negative sortOrder
        const negativeResult = fahrzeugtyp.update({
          sortOrder: -1,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(negativeResult.isFailure).toBe(true);
        expect(negativeResult.error).toContain('sortOrder muss größer oder gleich 0 sein');

        // When (Act) - NaN sortOrder
        const nanResult = fahrzeugtyp.update({
          sortOrder: Number.NaN,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(nanResult.isFailure).toBe(true);
        expect(nanResult.error).toContain('sortOrder muss eine ganze Zahl sein');

        // When (Act) - Float sortOrder
        const floatResult = fahrzeugtyp.update({
          sortOrder: 1.5,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(floatResult.isFailure).toBe(true);
        expect(floatResult.error).toContain('sortOrder muss eine ganze Zahl sein');
      });
    });

    describe('domain events', () => {
      // AI-R16 [MEDIUM]: Add Domain Events emission tests for update()
      it('should emit FahrzeugtypUpdatedEvent on successful update', () => {
        // Given (Arrange)
        const createProps: CreateFahrzeugtypProps = {
          code: 'HLF',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };
        const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;
        fahrzeugtyp.clearDomainEvents(); // Clear creation event

        const updateProps: UpdateFahrzeugtypProps = {
          bezeichnung: 'HLF 20/16',
          beschreibung: 'Neue Beschreibung',
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = fahrzeugtyp.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = fahrzeugtyp.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(FahrzeugtypUpdatedEvent);

        const event = events[0] as FahrzeugtypUpdatedEvent;
        expect(event.fahrzeugtypId).toBe(fahrzeugtyp.id.value);
        expect(event.changes).toEqual({
          bezeichnung: 'HLF 20/16',
          beschreibung: 'Neue Beschreibung',
        });
        expect(event.updatedBy).toBe(validCreatedBy);
      });

      it('should not emit event when update fails', () => {
        // Given (Arrange)
        const createProps: CreateFahrzeugtypProps = {
          code: 'HLF',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };
        const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;
        fahrzeugtyp.clearDomainEvents(); // Clear creation event

        // When (Act) - Update mit ungültigem sortOrder
        const result = fahrzeugtyp.update({
          sortOrder: -1,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        const events = fahrzeugtyp.getDomainEvents();
        expect(events).toHaveLength(0); // Kein Event bei Fehler
      });

      it('should not emit event when no changes are made', () => {
        // Given (Arrange)
        const createProps: CreateFahrzeugtypProps = {
          code: 'HLF',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          createdBy: validCreatedBy,
        };
        const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;
        fahrzeugtyp.clearDomainEvents(); // Clear creation event

        // When (Act) - Update ohne Änderungen (nur updatedBy)
        const result = fahrzeugtyp.update({
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = fahrzeugtyp.getDomainEvents();
        expect(events).toHaveLength(0); // Kein Event wenn keine Änderungen
      });
    });
  });

  describe('deactivate()', () => {
    it('should deactivate active fahrzeugtyp', () => {
      // Given (Arrange)
      const createProps: CreateFahrzeugtypProps = {
        code: 'DLK',
        bezeichnung: 'Drehleiter',
        kategorie: 'FUEHRUNG',
        createdBy: validCreatedBy,
      };
      const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;
      expect(fahrzeugtyp.istAktiv).toBe(true);

      // When (Act)
      const result = fahrzeugtyp.deactivate(validCreatedBy);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(fahrzeugtyp.istAktiv).toBe(false);
      expect(fahrzeugtyp.updatedBy).toBe(validCreatedBy);
    });

    it('should fail when deactivating already deactivated fahrzeugtyp', () => {
      // Given (Arrange)
      const createProps: CreateFahrzeugtypProps = {
        code: 'KTW',
        bezeichnung: 'Krankentransportwagen',
        kategorie: 'TRANSPORT',
        createdBy: validCreatedBy,
      };
      const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;
      fahrzeugtyp.deactivate(validCreatedBy);
      expect(fahrzeugtyp.istAktiv).toBe(false);

      // When (Act)
      const result = fahrzeugtyp.deactivate(validCreatedBy);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(FAHRZEUGTYP_ERROR_CODES.ALREADY_DEACTIVATED);
      expect(result.error).toContain('Fahrzeugtyp ist bereits deaktiviert');
    });
  });

  describe('reactivate()', () => {
    it('should reactivate deactivated fahrzeugtyp', () => {
      // Given (Arrange)
      const createProps: CreateFahrzeugtypProps = {
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'RETTUNGSDIENST',
        createdBy: validCreatedBy,
      };
      const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;
      fahrzeugtyp.deactivate(validCreatedBy);
      expect(fahrzeugtyp.istAktiv).toBe(false);

      // When (Act)
      const result = fahrzeugtyp.reactivate(validCreatedBy);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(fahrzeugtyp.istAktiv).toBe(true);
      expect(fahrzeugtyp.updatedBy).toBe(validCreatedBy);
    });

    it('should fail when reactivating already active fahrzeugtyp', () => {
      // Given (Arrange)
      const createProps: CreateFahrzeugtypProps = {
        code: 'NEF',
        bezeichnung: 'Notarzteinsatzfahrzeug',
        kategorie: 'RETTUNGSDIENST',
        createdBy: validCreatedBy,
      };
      const fahrzeugtyp = Fahrzeugtyp.create(createProps).value!;
      expect(fahrzeugtyp.istAktiv).toBe(true);

      // When (Act)
      const result = fahrzeugtyp.reactivate(validCreatedBy);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Fahrzeugtyp ist bereits aktiv');
    });
  });

  describe('reconstitute()', () => {
    describe('success', () => {
      it('should reconstitute fahrzeugtyp from database data', () => {
        // Given (Arrange)
        const props: ReconstituteFahrzeugtypProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          code: 'HLF', // Bereits UPPERCASE aus DB
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          beschreibung: 'Standard-Löschfahrzeug',
          sollbesatzung: { fahrer: 1, funktrupp: 5 },
          istAktiv: true,
          sortOrder: 10,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          createdBy: validCreatedBy,
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.reconstitute(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id.value).toBe(props.id);
        expect(result.value?.code).toBe('HLF');
        expect(result.value?.bezeichnung).toBe('Hilfeleistungslöschfahrzeug');
        expect(result.value?.sortOrder).toBe(10);
      });

      it('should not emit domain events on reconstitute', () => {
        // Given (Arrange)
        const props: ReconstituteFahrzeugtypProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          code: 'HLF',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          istAktiv: true,
          sortOrder: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.reconstitute(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const fahrzeugtyp = result.value!;
        const events = fahrzeugtyp.getDomainEvents();
        expect(events).toHaveLength(0); // Keine Events bei reconstitute (historische Daten)
      });
    });

    describe('validation', () => {
      // AI-R15 [MEDIUM]: Add reconstitute() ID validation test
      it('should fail with invalid ID format', () => {
        // Given (Arrange)
        const props: ReconstituteFahrzeugtypProps = {
          id: 'invalid-id-format', // Kein CUID2
          code: 'HLF',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          istAktiv: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Ungültige ID');
      });

      it('should fail when reconstituting with negative sortOrder', () => {
        // Given (Arrange)
        const props: ReconstituteFahrzeugtypProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          code: 'MTW',
          bezeichnung: 'Mannschaftstransportwagen',
          kategorie: 'TRANSPORT',
          istAktiv: true,
          sortOrder: -5, // Negativ (ungültig)
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('sortOrder muss >= 0 sein');
      });

      it('should fail when reconstituting with non-integer sortOrder', () => {
        // Given (Arrange)
        const props: ReconstituteFahrzeugtypProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          code: 'LF',
          bezeichnung: 'Löschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          istAktiv: true,
          sortOrder: Number.NaN, // NaN (ungültig)
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Ungültiger sortOrder in DB-Daten');
      });

      // AI-R9 [MEDIUM]: Add test: korrupte Sollbesatzung bei reconstitute()
      it('should fail with corrupted sollbesatzung data (negative values)', () => {
        // Given (Arrange)
        const props: ReconstituteFahrzeugtypProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          code: 'HLF',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          sollbesatzung: {
            fahrer: 1,
            funktrupp: -5, // Korrupte DB-Daten: negativer Wert
          },
          istAktiv: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.reconstitute(props);

        // Then (Assert)
        // Reconstitute validiert Sollbesatzung (Defense in Depth)
        // Schützt vor manuellen DB-Manipulationen
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Korrupte Sollbesatzung in DB-Daten');
        expect(result.error).toContain('Sollbesatzung.funktrupp muss >= 0 sein');
      });

      it('should fail with sollbesatzung Infinity in database', () => {
        // Given (Arrange)
        const props: ReconstituteFahrzeugtypProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          code: 'HLF',
          bezeichnung: 'Hilfeleistungslöschfahrzeug',
          kategorie: 'RETTUNGSDIENST',
          sollbesatzung: {
            fahrer: Number.POSITIVE_INFINITY, // Korrupte DB-Daten
          },
          istAktiv: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = Fahrzeugtyp.reconstitute(props);

        // Then (Assert)
        // Reconstitute validiert Sollbesatzung (Defense in Depth)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Korrupte Sollbesatzung in DB-Daten');
        expect(result.error).toContain('Sollbesatzung.fahrer muss eine ganze Zahl sein');
      });
    });
  });
});
