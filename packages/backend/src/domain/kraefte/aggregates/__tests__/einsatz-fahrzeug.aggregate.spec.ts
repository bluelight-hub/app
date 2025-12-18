import { EinsatzFahrzeug, type CreateEinsatzFahrzeugFromStammProps, type CreateTemporaryEinsatzFahrzeugProps, type ReconstituteEinsatzFahrzeugProps } from '../einsatz-fahrzeug.aggregate';
import { EINSATZ_FAHRZEUG_ERROR_CODES } from '../../common/einsatz-fahrzeug-error-codes';
import { EINSATZ_FAHRZEUG_VALIDATION } from '../../constants/einsatz-fahrzeug-validation.constants';
import { FahrzeugErfasstEvent } from '../../events/fahrzeug-erfasst.event';
import { FmsStatusGeaendertEvent } from '../../events/fms-status-geaendert.event';

describe('EinsatzFahrzeug Aggregate', () => {
  const validCreatedBy = 'clw3h8x9y0000qwertyuiopas'; // Valid CUID2
  const validStammId = 'clw3h8x9y0000qwertyuiopzz'; // Valid CUID2 for StammFahrzeug
  const validFahrzeugtypId = 'clw3h8x9y0000qwertyuiopyy'; // Valid CUID2 for Fahrzeugtyp
  const validEinsatzId = 'e3b0c442-98fc-1c14-b39f-f8d9b3e1b5a2'; // Valid UUID for Einsatz

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFromStammdaten()', () => {
    describe('validation', () => {
      it('should fail when einsatzId is empty', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: '',
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('EinsatzId ist erforderlich');
      });

      it('should fail when stammId is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: 'invalid-cuid',
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('stammId muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when fahrzeugtypId is empty', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: '',
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('FahrzeugtypId ist erforderlich');
      });

      it('should fail when fahrzeugtypId is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: 'invalid-cuid',
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when funkrufname is empty', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: '',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funkrufname ist erforderlich');
      });

      it('should fail when funkrufname is too long', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'A'.repeat(101), // 101 Zeichen (max: 100)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funkrufname darf maximal');
      });

      it('should fail when kennzeichen is too long', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          kennzeichen: 'A'.repeat(21), // 21 Zeichen (max: 20)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Kennzeichen darf maximal');
      });

      it('should fail when createdBy is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: 'invalid-cuid',
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when position has invalid latitude', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
          position: { lat: 91, lng: 10 }, // Lat > 90
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION);
      });

      it('should fail when position has invalid longitude', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
          position: { lat: 50, lng: 181 }, // Lng > 180
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION);
      });
    });

    describe('success', () => {
      it('should create einsatz-fahrzeug successfully with valid data', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian Musterstadt 1/46/1',
          kennzeichen: 'DA-RK 101',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value?.einsatzId).toBe(validEinsatzId);
        expect(result.value?.stammId).toBe(validStammId);
        expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(result.value?.funkrufname).toBe('Florian Musterstadt 1/46/1');
        expect(result.value?.kennzeichen).toBe('DA-RK 101');
        expect(result.value?.createdBy).toBe(validCreatedBy);
      });

      it('should set initial FMS-Status to 2 (Einsatzbereit)', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.fmsStatus).toBe(EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_DEFAULT);
        expect(result.value?.fmsStatus).toBe(2); // Einsatzbereit
      });

      it('should create einsatz-fahrzeug without optional fields', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
          // Keine kennzeichen, position
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kennzeichen).toBeUndefined();
        expect(result.value?.position).toBeUndefined();
      });

      it('should create einsatz-fahrzeug with valid position', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
          position: { lat: 50.9375, lng: 6.9603 }, // Köln
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.position).toBeDefined();
        expect(result.value?.position?.lat).toBe(50.9375);
        expect(result.value?.position?.lng).toBe(6.9603);
      });

      it('should trim whitespace from string fields', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: `  ${validEinsatzId}  `,
          stammId: `  ${validStammId}  `,
          fahrzeugtypId: `  ${validFahrzeugtypId}  `,
          funkrufname: '  Florian 1/46/1  ',
          kennzeichen: '  DA-RK 101  ',
          createdBy: `  ${validCreatedBy}  `,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.einsatzId).toBe(validEinsatzId);
        expect(result.value?.stammId).toBe(validStammId);
        expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(result.value?.funkrufname).toBe('Florian 1/46/1');
        expect(result.value?.kennzeichen).toBe('DA-RK 101');
        expect(result.value?.createdBy).toBe(validCreatedBy);
      });

      it('should convert empty kennzeichen to undefined', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          kennzeichen: '   ', // Nur Whitespace
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kennzeichen).toBeUndefined();
      });
    });

    describe('domain events', () => {
      it('should emit FahrzeugErfasstEvent on successful creation', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian Musterstadt 1/46/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const einsatzFahrzeug = result.value!;
        const events = einsatzFahrzeug.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(FahrzeugErfasstEvent);

        const event = events[0] as FahrzeugErfasstEvent;
        expect(event.einsatzId).toBe(validEinsatzId);
        expect(event.einsatzFahrzeugId).toBe(einsatzFahrzeug.id.value);
        expect(event.funkrufname).toBe('Florian Musterstadt 1/46/1');
        expect(event.stammId).toBe(validStammId);
        expect(event.fmsStatus).toBe(2); // Initial: Einsatzbereit
        expect(event.erfasstVon).toBe(validCreatedBy);
      });

      it('should not emit event when creation fails', () => {
        // Given (Arrange)
        const props: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: 'invalid-cuid', // Ungültig
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createFromStammdaten(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.value).toBeUndefined();
      });
    });
  });

  describe('createTemporary()', () => {
    describe('validation', () => {
      it('should fail when einsatzId is empty', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: '',
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('EinsatzId ist erforderlich');
      });

      it('should fail when fahrzeugtypId is empty', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: '',
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('FahrzeugtypId ist erforderlich');
      });

      it('should fail when fahrzeugtypId is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: 'invalid-cuid',
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when funkrufname is empty', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: '',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funkrufname ist erforderlich');
      });

      it('should fail when funkrufname is too long', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'A'.repeat(101), // 101 Zeichen (max: 100)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funkrufname darf maximal');
      });

      it('should fail when kennzeichen is too long', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          kennzeichen: 'A'.repeat(21), // 21 Zeichen (max: 20)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Kennzeichen darf maximal');
      });

      it('should fail when createdBy is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: 'invalid-cuid',
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when position has invalid latitude', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
          position: { lat: 91, lng: 10 }, // Lat > 90
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION);
      });

      it('should fail when position has invalid longitude', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
          position: { lat: 50, lng: 181 }, // Lng > 180
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION);
      });
    });

    describe('success', () => {
      it('should create temporary einsatz-fahrzeug successfully with valid data', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          kennzeichen: 'DA-RD 1234',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value?.einsatzId).toBe(validEinsatzId);
        expect(result.value?.stammId).toBeUndefined(); // WICHTIG: temporäres Fahrzeug hat keine stammId
        expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(result.value?.funkrufname).toBe('RTW 45/1');
        expect(result.value?.kennzeichen).toBe('DA-RD 1234');
        expect(result.value?.createdBy).toBe(validCreatedBy);
      });

      it('should set stammId to undefined for temporary vehicles', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.stammId).toBeUndefined(); // Keine Stammdaten-Referenz
      });

      it('should set initial FMS-Status to 2 (Einsatzbereit)', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.fmsStatus).toBe(EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_DEFAULT);
        expect(result.value?.fmsStatus).toBe(2); // Einsatzbereit
      });

      it('should create temporary einsatz-fahrzeug without optional fields', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
          // Keine kennzeichen, position
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kennzeichen).toBeUndefined();
        expect(result.value?.position).toBeUndefined();
      });

      it('should create temporary einsatz-fahrzeug with valid position', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
          position: { lat: 50.9375, lng: 6.9603 }, // Köln
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.position).toBeDefined();
        expect(result.value?.position?.lat).toBe(50.9375);
        expect(result.value?.position?.lng).toBe(6.9603);
      });

      it('should trim whitespace from string fields', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: `  ${validEinsatzId}  `,
          fahrzeugtypId: `  ${validFahrzeugtypId}  `,
          funkrufname: '  RTW 45/1  ',
          kennzeichen: '  DA-RD 1234  ',
          createdBy: `  ${validCreatedBy}  `,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.einsatzId).toBe(validEinsatzId);
        expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(result.value?.funkrufname).toBe('RTW 45/1');
        expect(result.value?.kennzeichen).toBe('DA-RD 1234');
        expect(result.value?.createdBy).toBe(validCreatedBy);
      });

      it('should convert empty kennzeichen to undefined', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          kennzeichen: '   ', // Nur Whitespace
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kennzeichen).toBeUndefined();
      });
    });

    describe('domain events', () => {
      it('should emit FahrzeugErfasstEvent with stammId undefined on successful creation', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const einsatzFahrzeug = result.value!;
        const events = einsatzFahrzeug.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(FahrzeugErfasstEvent);

        const event = events[0] as FahrzeugErfasstEvent;
        expect(event.einsatzId).toBe(validEinsatzId);
        expect(event.einsatzFahrzeugId).toBe(einsatzFahrzeug.id.value);
        expect(event.funkrufname).toBe('RTW 45/1');
        expect(event.stammId).toBeUndefined(); // WICHTIG: stammId ist undefined für temporäre Fahrzeuge
        expect(event.fmsStatus).toBe(2); // Initial: Einsatzbereit
        expect(event.erfasstVon).toBe(validCreatedBy);
      });

      it('should not emit event when creation fails', () => {
        // Given (Arrange)
        const props: CreateTemporaryEinsatzFahrzeugProps = {
          einsatzId: validEinsatzId,
          fahrzeugtypId: 'invalid-cuid', // Ungültig
          funkrufname: 'RTW 45/1',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.createTemporary(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.value).toBeUndefined();
      });
    });
  });

  describe('updateFmsStatus()', () => {
    describe('validation', () => {
      it('should fail when fmsStatus is below minimum (0)', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: -1, // Unter Minimum
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS);
      });

      it('should fail when fmsStatus is above maximum (9)', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 10, // Über Maximum
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS);
      });

      it('should fail when fmsStatus is not an integer', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 2.5, // Float statt Integer
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS);
      });

      it('should fail when fmsStatus is NaN', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: Number.NaN,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS);
      });

      it('should fail when updatedBy is not a valid CUID', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 4,
          updatedBy: 'invalid-cuid',
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when position has invalid coordinates and NOT emit event', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        einsatzFahrzeug.clearDomainEvents(); // Clear FahrzeugErfasstEvent from creation

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 4,
          updatedBy: validCreatedBy,
          position: { lat: -91, lng: 10 }, // Ungültige Latitude
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION);
        // Verifiziere dass bei Validierungsfehler KEIN Event emittiert wird
        const events = einsatzFahrzeug.getDomainEvents().filter((e) => e.constructor.name === 'FmsStatusGeaendertEvent');
        expect(events.length).toBe(0);
      });
    });

    describe('success', () => {
      it('should update fmsStatus successfully', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        expect(einsatzFahrzeug.fmsStatus).toBe(2); // Initial

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 4, // Am Einsatzort
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(einsatzFahrzeug.fmsStatus).toBe(4);
        expect(einsatzFahrzeug.updatedBy).toBe(validCreatedBy);
      });

      it('should accept FMS status 0 (minimum boundary)', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 0,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(einsatzFahrzeug.fmsStatus).toBe(0);
      });

      it('should accept FMS status 9 (maximum boundary)', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 9,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(einsatzFahrzeug.fmsStatus).toBe(9);
      });

      it('should emit FmsStatusGeaendertEvent when updating to status 0', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        einsatzFahrzeug.clearDomainEvents(); // Clear FahrzeugErfasstEvent from creation

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 0,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = einsatzFahrzeug.getDomainEvents();
        expect(events.length).toBe(1);
        expect(events[0].constructor.name).toBe('FmsStatusGeaendertEvent');
        const event = events[0] as FmsStatusGeaendertEvent;
        expect(event.neuerStatus).toBe(0);
        expect(event.alterStatus).toBe(2); // Initial status
      });

      it('should emit FmsStatusGeaendertEvent when updating to status 9', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        einsatzFahrzeug.clearDomainEvents(); // Clear FahrzeugErfasstEvent from creation

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 9,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = einsatzFahrzeug.getDomainEvents();
        expect(events.length).toBe(1);
        expect(events[0].constructor.name).toBe('FmsStatusGeaendertEvent');
        const event = events[0] as FmsStatusGeaendertEvent;
        expect(event.neuerStatus).toBe(9);
        expect(event.alterStatus).toBe(2); // Initial status
      });

      it.each([1, 2, 3, 4, 5, 6, 7, 8])('should accept FMS status %i', (status) => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: status,
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(einsatzFahrzeug.fmsStatus).toBe(status);
      });

      it('should update position along with fmsStatus', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        expect(einsatzFahrzeug.position).toBeUndefined();

        // When (Act)
        const result = einsatzFahrzeug.updateFmsStatus({
          fmsStatus: 4,
          updatedBy: validCreatedBy,
          position: { lat: 50.9375, lng: 6.9603 },
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(einsatzFahrzeug.position).toBeDefined();
        expect(einsatzFahrzeug.position?.lat).toBe(50.9375);
        expect(einsatzFahrzeug.position?.lng).toBe(6.9603);
      });
    });

    describe('FmsStatusGeaendertEvent emission (Story 3.3)', () => {
      it('should emit FmsStatusGeaendertEvent with correct data on status change', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const fahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        fahrzeug.clearDomainEvents(); // Clear FahrzeugErfasstEvent from creation
        const alterStatus = fahrzeug.fmsStatus; // Initial: 2 (Einsatzbereit)
        const neuerStatus = 4; // Am Einsatzort
        const updatedBy = validCreatedBy;

        // When (Act)
        const result = fahrzeug.updateFmsStatus({
          fmsStatus: neuerStatus,
          updatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);

        const events = fahrzeug.getDomainEvents();
        expect(events).toHaveLength(1);

        const event = events[0] as FmsStatusGeaendertEvent;
        expect(event).toBeInstanceOf(FmsStatusGeaendertEvent);
        expect(event.einsatzFahrzeugId).toBe(fahrzeug.id.value);
        expect(event.einsatzId).toBe(fahrzeug.einsatzId);
        expect(event.funkrufname).toBe(fahrzeug.funkrufname);
        expect(event.alterStatus).toBe(alterStatus);
        expect(event.neuerStatus).toBe(neuerStatus);
        expect(event.geaendertVon).toBe(updatedBy);
      });

      it('should capture old status BEFORE mutation in event', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const fahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        const initialStatus = fahrzeug.fmsStatus; // 2
        expect(initialStatus).toBe(2);

        // When (Act) - First update
        fahrzeug.updateFmsStatus({ fmsStatus: 3, updatedBy: validCreatedBy });
        fahrzeug.clearDomainEvents();

        // When (Act) - Second update
        const result = fahrzeug.updateFmsStatus({ fmsStatus: 4, updatedBy: validCreatedBy });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = fahrzeug.getDomainEvents();
        const event = events[0] as FmsStatusGeaendertEvent;
        expect(event.alterStatus).toBe(3); // Should be 3, not 2
        expect(event.neuerStatus).toBe(4);
      });

      it('should NOT emit event when status validation fails', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const fahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        fahrzeug.clearDomainEvents(); // Clear FahrzeugErfasstEvent from creation

        // When (Act) - Invalid status
        const result = fahrzeug.updateFmsStatus({
          fmsStatus: 10, // Invalid: > 9
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(fahrzeug.getDomainEvents()).toHaveLength(0);
      });

      it('should NOT emit event when updatedBy validation fails', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const fahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        fahrzeug.clearDomainEvents(); // Clear FahrzeugErfasstEvent from creation

        // When (Act) - Invalid updatedBy
        const result = fahrzeug.updateFmsStatus({
          fmsStatus: 3,
          updatedBy: '', // Invalid: empty
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(fahrzeug.getDomainEvents()).toHaveLength(0);
      });

      it('should NOT emit event when status equals current status (idempotency)', () => {
        // Given (Arrange)
        const createProps: CreateEinsatzFahrzeugFromStammProps = {
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          createdBy: validCreatedBy,
        };
        const fahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
        const currentStatus = fahrzeug.fmsStatus; // Initial: 2 (Einsatzbereit)
        expect(currentStatus).toBe(2);
        fahrzeug.clearDomainEvents(); // Clear FahrzeugErfasstEvent from creation

        // When (Act) - Set to SAME status
        const result = fahrzeug.updateFmsStatus({
          fmsStatus: currentStatus, // GLEICHER Status wie vorher (2)
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(fahrzeug.fmsStatus).toBe(2); // Status unverändert

        // ERWARTETES VERHALTEN (IDEMPOTENZ):
        // Kein Event wird emittiert, wenn Status unverändert bleibt.
        // GRUND: Verhindert ETB-Spam durch wiederholte Status-Meldungen ohne Änderung.
        // API gibt trotzdem 200 OK zurück (idempotent operation).
        const events = fahrzeug.getDomainEvents();
        expect(events.length).toBe(0); // NO event emitted
      });
    });
  });

  describe('reconstitute()', () => {
    describe('success', () => {
      it('should reconstitute einsatz-fahrzeug from database data', () => {
        // Given (Arrange)
        const props: ReconstituteEinsatzFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian Musterstadt 1/46/1',
          kennzeichen: 'DA-RK 101',
          fmsStatus: 4,
          position: { lat: 50.9375, lng: 6.9603 },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          createdBy: validCreatedBy,
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id.value).toBe(props.id);
        expect(result.value?.einsatzId).toBe(validEinsatzId);
        expect(result.value?.stammId).toBe(validStammId);
        expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(result.value?.funkrufname).toBe('Florian Musterstadt 1/46/1');
        expect(result.value?.kennzeichen).toBe('DA-RK 101');
        expect(result.value?.fmsStatus).toBe(4);
        expect(result.value?.position?.lat).toBe(50.9375);
        expect(result.value?.position?.lng).toBe(6.9603);
      });

      it('should reconstitute einsatz-fahrzeug without optional fields', () => {
        // Given (Arrange)
        const props: ReconstituteEinsatzFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          fmsStatus: 2,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          createdBy: validCreatedBy,
          // Keine stammId, kennzeichen, position, updatedBy
        };

        // When (Act)
        const result = EinsatzFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.stammId).toBeUndefined();
        expect(result.value?.kennzeichen).toBeUndefined();
        expect(result.value?.position).toBeUndefined();
        expect(result.value?.updatedBy).toBeUndefined();
      });

      it('should not emit domain events on reconstitute', () => {
        // Given (Arrange)
        const props: ReconstituteEinsatzFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          einsatzId: validEinsatzId,
          stammId: validStammId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          fmsStatus: 2,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const einsatzFahrzeug = result.value!;
        const events = einsatzFahrzeug.getDomainEvents();
        expect(events).toHaveLength(0); // Keine Events bei reconstitute
      });
    });

    describe('validation', () => {
      it('should fail with invalid ID format', () => {
        // Given (Arrange)
        const props: ReconstituteEinsatzFahrzeugProps = {
          id: 'invalid-id-format', // Kein CUID2
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          fmsStatus: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Ungültige ID');
      });

      it('should fail when reconstituting with corrupted fmsStatus data', () => {
        // Given (Arrange)
        const props: ReconstituteEinsatzFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          fmsStatus: 10, // Korrupte DB-Daten: > 9
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Korrupter FMS-Status in DB-Daten');
      });

      it('should fail when reconstituting with corrupted position data', () => {
        // Given (Arrange)
        const props: ReconstituteEinsatzFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          einsatzId: validEinsatzId,
          fahrzeugtypId: validFahrzeugtypId,
          funkrufname: 'Florian 1/46/1',
          fmsStatus: 2,
          position: { lat: 91, lng: 10 }, // Korrupte Koordinaten
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = EinsatzFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Korrupte Position in DB-Daten');
      });
    });
  });

  describe('immutability', () => {
    it('should NOT allow changing einsatzId after creation', () => {
      // Given (Arrange)
      const createProps: CreateEinsatzFahrzeugFromStammProps = {
        einsatzId: validEinsatzId,
        stammId: validStammId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'Florian 1/46/1',
        createdBy: validCreatedBy,
      };
      const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
      const originalEinsatzId = einsatzFahrzeug.einsatzId;

      // When (Act) - FMS-Status Update sollte einsatzId nicht ändern
      einsatzFahrzeug.updateFmsStatus({ fmsStatus: 4, updatedBy: validCreatedBy });

      // Then (Assert)
      expect(einsatzFahrzeug.einsatzId).toBe(originalEinsatzId); // IMMUTABLE
    });

    it('should NOT allow changing fahrzeugtypId after creation', () => {
      // Given (Arrange)
      const createProps: CreateEinsatzFahrzeugFromStammProps = {
        einsatzId: validEinsatzId,
        stammId: validStammId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'Florian 1/46/1',
        createdBy: validCreatedBy,
      };
      const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
      const originalFahrzeugtypId = einsatzFahrzeug.fahrzeugtypId;

      // When (Act) - FMS-Status Update sollte fahrzeugtypId nicht ändern
      einsatzFahrzeug.updateFmsStatus({ fmsStatus: 4, updatedBy: validCreatedBy });

      // Then (Assert)
      expect(einsatzFahrzeug.fahrzeugtypId).toBe(originalFahrzeugtypId); // IMMUTABLE
    });

    it('should NOT allow changing stammId after creation', () => {
      // Given (Arrange)
      const createProps: CreateEinsatzFahrzeugFromStammProps = {
        einsatzId: validEinsatzId,
        stammId: validStammId,
        fahrzeugtypId: validFahrzeugtypId,
        funkrufname: 'Florian 1/46/1',
        createdBy: validCreatedBy,
      };
      const einsatzFahrzeug = EinsatzFahrzeug.createFromStammdaten(createProps).value!;
      const originalStammId = einsatzFahrzeug.stammId;

      // When (Act) - FMS-Status Update sollte stammId nicht ändern
      einsatzFahrzeug.updateFmsStatus({ fmsStatus: 4, updatedBy: validCreatedBy });

      // Then (Assert)
      expect(einsatzFahrzeug.stammId).toBe(originalStammId); // IMMUTABLE
    });
  });
});
