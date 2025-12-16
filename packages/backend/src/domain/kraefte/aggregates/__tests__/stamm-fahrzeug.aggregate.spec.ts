import { StammFahrzeug, type CreateStammFahrzeugProps, type UpdateStammFahrzeugProps, type ReconstituteStammFahrzeugProps } from '../stamm-fahrzeug.aggregate';
import { STAMM_FAHRZEUG_ERROR_CODES } from '../../common/stamm-fahrzeug-error-codes';
import { StammFahrzeugCreatedEvent } from '../../events/stamm-fahrzeug-created.event';
import { StammFahrzeugUpdatedEvent } from '../../events/stamm-fahrzeug-updated.event';

describe('StammFahrzeug Aggregate', () => {
  const validCreatedBy = 'clw3h8x9y0000qwertyuiopas'; // Valid CUID2
  const validFahrzeugtypId = 'clw3h8x9y0000qwertyuiopzz'; // Valid CUID2 for Fahrzeugtyp

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    describe('validation', () => {
      it('should fail when rufname is too short', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'A', // Nur 1 Zeichen (min: 2)
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Rufname muss mindestens 2 Zeichen haben');
      });

      it('should fail when rufname is too long', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'A'.repeat(101), // 101 Zeichen (max: 100)
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Rufname darf maximal 100 Zeichen haben');
      });

      it('should fail when funkrufname is too short', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'F', // Nur 1 Zeichen (min: 2)
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funkrufname muss mindestens 2 Zeichen haben');
      });

      it('should fail when funkrufname is too long', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'A'.repeat(51), // 51 Zeichen (max: 50)
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Funkrufname darf maximal 50 Zeichen haben');
      });

      it('should fail when fahrzeugtypId is empty', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: '', // Leer
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Fahrzeugtyp-ID ist erforderlich');
      });

      it('should fail when fahrzeugtypId is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: 'invalid-cuid',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('fahrzeugtypId muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when kennzeichen is too long', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          kennzeichen: 'A'.repeat(21), // 21 Zeichen (max: 20)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Kennzeichen darf maximal 20 Zeichen haben');
      });

      it('should fail when baujahr is too low', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          baujahr: 1899, // Unter Minimum (min: 1900)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Baujahr muss mindestens 1900 sein');
      });

      it('should fail when baujahr is not an integer', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          baujahr: 2020.5, // Float statt Integer
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Baujahr muss eine ganze Zahl sein');
      });

      it('should fail when baujahr is NaN', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          baujahr: Number.NaN,
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Baujahr muss eine ganze Zahl sein');
      });

      it('should fail when funkkenungBOS is too long', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          funkkenungBOS: 'A'.repeat(51), // 51 Zeichen (max: 50)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('BOS-Funkkennung darf maximal 50 Zeichen haben');
      });

      it('should fail when createdBy is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: 'invalid-cuid',
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy muss ein gültiger CUID2-Identifier sein');
      });
    });

    describe('success', () => {
      it('should create stamm-fahrzeug successfully with valid data', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          kennzeichen: 'DA-RK 101',
          baujahr: 2020,
          funkkenungBOS: 'BOS-12345',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value?.rufname).toBe('RTW 1');
        expect(result.value?.funkrufname).toBe('Florian Musterstadt 1/46/1');
        expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(result.value?.kennzeichen).toBe('DA-RK 101');
        expect(result.value?.baujahr).toBe(2020);
        expect(result.value?.funkkenungBOS).toBe('BOS-12345');
        expect(result.value?.createdBy).toBe(validCreatedBy);
        expect(result.value?.isArchived).toBe(false);
      });

      it('should create stamm-fahrzeug without optional fields', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'KTW 2',
          funkrufname: 'Florian Musterstadt 1/46/2',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
          // Keine kennzeichen, baujahr, funkkenungBOS
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kennzeichen).toBeUndefined();
        expect(result.value?.baujahr).toBeUndefined();
        expect(result.value?.funkkenungBOS).toBeUndefined();
      });

      it('should trim whitespace from string fields', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: '  RTW 1  ',
          funkrufname: '  Florian 1/46/1  ',
          fahrzeugtypId: `  ${validFahrzeugtypId}  `,
          kennzeichen: '  DA-RK 101  ',
          funkkenungBOS: '  BOS-12345  ',
          createdBy: `  ${validCreatedBy}  `,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.rufname).toBe('RTW 1');
        expect(result.value?.funkrufname).toBe('Florian 1/46/1');
        expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(result.value?.kennzeichen).toBe('DA-RK 101');
        expect(result.value?.funkkenungBOS).toBe('BOS-12345');
        expect(result.value?.createdBy).toBe(validCreatedBy);
      });

      it('should convert empty string to undefined for optional fields', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          kennzeichen: '   ', // Nur Whitespace
          funkkenungBOS: '', // Leerer String
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kennzeichen).toBeUndefined();
        expect(result.value?.funkkenungBOS).toBeUndefined();
      });
    });

    describe('domain events', () => {
      it('should emit StammFahrzeugCreatedEvent on successful creation', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const stammFahrzeug = result.value!;
        const events = stammFahrzeug.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StammFahrzeugCreatedEvent);

        const event = events[0] as StammFahrzeugCreatedEvent;
        expect(event.stammFahrzeugId).toBe(stammFahrzeug.id.value);
        expect(event.rufname).toBe('RTW 1');
        expect(event.funkrufname).toBe('Florian Musterstadt 1/46/1');
        expect(event.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(event.createdBy).toBe(validCreatedBy);
      });

      it('should not emit event when creation fails', () => {
        // Given (Arrange)
        const props: CreateStammFahrzeugProps = {
          rufname: 'A', // Ungültig (zu kurz)
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.value).toBeUndefined();
      });
    });
  });

  describe('update()', () => {
    describe('success', () => {
      it('should update stamm-fahrzeug successfully', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;

        const updateProps: UpdateStammFahrzeugProps = {
          rufname: 'RTW 1-1',
          funkrufname: 'Florian Musterstadt 1/46/1-1',
          kennzeichen: 'DA-RK 102',
          baujahr: 2021,
          funkkenungBOS: 'BOS-67890',
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = stammFahrzeug.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(stammFahrzeug.rufname).toBe('RTW 1-1');
        expect(stammFahrzeug.funkrufname).toBe('Florian Musterstadt 1/46/1-1');
        expect(stammFahrzeug.kennzeichen).toBe('DA-RK 102');
        expect(stammFahrzeug.baujahr).toBe(2021);
        expect(stammFahrzeug.funkkenungBOS).toBe('BOS-67890');
        expect(stammFahrzeug.updatedBy).toBe(validCreatedBy);
      });

      it('should trim whitespace on update', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;

        const updateProps: UpdateStammFahrzeugProps = {
          rufname: '  RTW 1-1  ',
          funkrufname: '  Florian 1/46/1-1  ',
          kennzeichen: '  DA-RK 102  ',
          funkkenungBOS: '  BOS-67890  ',
          updatedBy: `  ${validCreatedBy}  `,
        };

        // When (Act)
        const result = stammFahrzeug.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(stammFahrzeug.rufname).toBe('RTW 1-1');
        expect(stammFahrzeug.funkrufname).toBe('Florian 1/46/1-1');
        expect(stammFahrzeug.kennzeichen).toBe('DA-RK 102');
        expect(stammFahrzeug.funkkenungBOS).toBe('BOS-67890');
        expect(stammFahrzeug.updatedBy).toBe(validCreatedBy);
      });

      it('should convert empty string to undefined for optional fields on update', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          kennzeichen: 'DA-RK 101',
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;

        // When (Act)
        const result = stammFahrzeug.update({
          kennzeichen: '   ', // Nur Whitespace
          funkkenungBOS: '', // Leerer String
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(stammFahrzeug.kennzeichen).toBeUndefined();
        expect(stammFahrzeug.funkkenungBOS).toBeUndefined();
      });
    });

    describe('validation', () => {
      it('should fail when rufname is too short on update', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;

        // When (Act)
        const result = stammFahrzeug.update({
          rufname: 'A', // Zu kurz
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Rufname muss mindestens 2 Zeichen haben');
      });

      it('should fail when baujahr is invalid on update', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;

        // When (Act)
        const result = stammFahrzeug.update({
          baujahr: 1899, // Zu niedrig
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Baujahr muss mindestens 1900 sein');
      });

      it('should fail when updatedBy is not a valid CUID', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;

        // When (Act)
        const result = stammFahrzeug.update({
          rufname: 'RTW 1-1',
          updatedBy: 'invalid-cuid',
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
      });
    });

    describe('domain events', () => {
      it('should emit StammFahrzeugUpdatedEvent on successful update', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;
        stammFahrzeug.clearDomainEvents(); // Clear creation event

        const updateProps: UpdateStammFahrzeugProps = {
          rufname: 'RTW 1-1',
          kennzeichen: 'DA-RK 102',
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = stammFahrzeug.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = stammFahrzeug.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StammFahrzeugUpdatedEvent);

        const event = events[0] as StammFahrzeugUpdatedEvent;
        expect(event.stammFahrzeugId).toBe(stammFahrzeug.id.value);
        expect(event.changes).toEqual({
          rufname: 'RTW 1-1',
          kennzeichen: 'DA-RK 102',
        });
        expect(event.updatedBy).toBe(validCreatedBy);
      });

      it('should not emit event when update fails', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;
        stammFahrzeug.clearDomainEvents(); // Clear creation event

        // When (Act)
        const result = stammFahrzeug.update({
          rufname: 'A', // Ungültig
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        const events = stammFahrzeug.getDomainEvents();
        expect(events).toHaveLength(0); // Kein Event bei Fehler
      });

      it('should not emit event when no changes are made', () => {
        // Given (Arrange)
        const createProps: CreateStammFahrzeugProps = {
          rufname: 'RTW 1',
          funkrufname: 'Florian 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdBy: validCreatedBy,
        };
        const stammFahrzeug = StammFahrzeug.create(createProps).value!;
        stammFahrzeug.clearDomainEvents(); // Clear creation event

        // When (Act)
        const result = stammFahrzeug.update({
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = stammFahrzeug.getDomainEvents();
        expect(events).toHaveLength(0); // Kein Event wenn keine Änderungen
      });
    });
  });

  describe('archive()', () => {
    it('should archive stamm-fahrzeug successfully', () => {
      // Given (Arrange)
      const createProps: CreateStammFahrzeugProps = {
        rufname: 'RTW 1',
        funkrufname: 'Florian Musterstadt 1/46/1',
        fahrzeugtypId: validFahrzeugtypId,
        createdBy: validCreatedBy,
      };
      const stammFahrzeug = StammFahrzeug.create(createProps).value!;
      expect(stammFahrzeug.isArchived).toBe(false);

      // When (Act)
      const result = stammFahrzeug.archive(validCreatedBy);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(stammFahrzeug.isArchived).toBe(true);
      expect(stammFahrzeug.archivedAt).toBeDefined();
      expect(stammFahrzeug.archivedBy).toBe(validCreatedBy);
      expect(stammFahrzeug.updatedBy).toBe(validCreatedBy);
    });

    it('should fail when archiving already archived fahrzeug', () => {
      // Given (Arrange)
      const createProps: CreateStammFahrzeugProps = {
        rufname: 'RTW 1',
        funkrufname: 'Florian Musterstadt 1/46/1',
        fahrzeugtypId: validFahrzeugtypId,
        createdBy: validCreatedBy,
      };
      const stammFahrzeug = StammFahrzeug.create(createProps).value!;
      stammFahrzeug.archive(validCreatedBy);
      expect(stammFahrzeug.isArchived).toBe(true);

      // When (Act)
      const result = stammFahrzeug.archive(validCreatedBy);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(STAMM_FAHRZEUG_ERROR_CODES.ALREADY_ARCHIVED);
      expect(result.error).toContain('Fahrzeug ist bereits archiviert');
    });

    it('should fail when archivedBy is not a valid CUID', () => {
      // Given (Arrange)
      const createProps: CreateStammFahrzeugProps = {
        rufname: 'RTW 1',
        funkrufname: 'Florian Musterstadt 1/46/1',
        fahrzeugtypId: validFahrzeugtypId,
        createdBy: validCreatedBy,
      };
      const stammFahrzeug = StammFahrzeug.create(createProps).value!;

      // When (Act)
      const result = stammFahrzeug.archive('invalid-cuid');

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('archivedBy muss ein gültiger CUID2-Identifier sein');
    });

    it('should emit StammFahrzeugUpdatedEvent on archive', () => {
      // Given (Arrange)
      const createProps: CreateStammFahrzeugProps = {
        rufname: 'RTW 1',
        funkrufname: 'Florian Musterstadt 1/46/1',
        fahrzeugtypId: validFahrzeugtypId,
        createdBy: validCreatedBy,
      };
      const stammFahrzeug = StammFahrzeug.create(createProps).value!;
      stammFahrzeug.clearDomainEvents(); // Clear creation event

      // When (Act)
      const result = stammFahrzeug.archive(validCreatedBy);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = stammFahrzeug.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(StammFahrzeugUpdatedEvent);

      const event = events[0] as StammFahrzeugUpdatedEvent;
      expect(event.stammFahrzeugId).toBe(stammFahrzeug.id.value);
      expect(event.updatedBy).toBe(validCreatedBy);
    });
  });

  describe('reconstitute()', () => {
    describe('success', () => {
      it('should reconstitute stamm-fahrzeug from database data', () => {
        // Given (Arrange)
        const props: ReconstituteStammFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          kennzeichen: 'DA-RK 101',
          baujahr: 2020,
          funkkenungBOS: 'BOS-12345',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          createdBy: validCreatedBy,
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id.value).toBe(props.id);
        expect(result.value?.rufname).toBe('RTW 1');
        expect(result.value?.funkrufname).toBe('Florian Musterstadt 1/46/1');
        expect(result.value?.fahrzeugtypId).toBe(validFahrzeugtypId);
        expect(result.value?.kennzeichen).toBe('DA-RK 101');
        expect(result.value?.baujahr).toBe(2020);
        expect(result.value?.funkkenungBOS).toBe('BOS-12345');
        expect(result.value?.isArchived).toBe(false);
      });

      it('should reconstitute archived stamm-fahrzeug', () => {
        // Given (Arrange)
        const props: ReconstituteStammFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          archivedAt: new Date('2024-01-15'),
          archivedBy: validCreatedBy,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          createdBy: validCreatedBy,
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.isArchived).toBe(true);
        expect(result.value?.archivedAt).toEqual(new Date('2024-01-15'));
        expect(result.value?.archivedBy).toBe(validCreatedBy);
      });

      it('should not emit domain events on reconstitute', () => {
        // Given (Arrange)
        const props: ReconstituteStammFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const stammFahrzeug = result.value!;
        const events = stammFahrzeug.getDomainEvents();
        expect(events).toHaveLength(0); // Keine Events bei reconstitute (historische Daten)
      });
    });

    describe('validation', () => {
      it('should fail with invalid ID format', () => {
        // Given (Arrange)
        const props: ReconstituteStammFahrzeugProps = {
          id: 'invalid-id-format', // Kein CUID2
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Ungültige ID');
      });

      it('should fail when reconstituting with corrupted baujahr data', () => {
        // Given (Arrange)
        const props: ReconstituteStammFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          baujahr: 1899, // Korrupte DB-Daten: zu niedrig
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Korruptes Baujahr in DB-Daten');
        expect(result.error).toContain('Baujahr muss mindestens 1900 sein');
      });

      it('should fail when reconstituting with NaN baujahr', () => {
        // Given (Arrange)
        const props: ReconstituteStammFahrzeugProps = {
          id: 'clw3h8x9y0000qwertyuiopas',
          rufname: 'RTW 1',
          funkrufname: 'Florian Musterstadt 1/46/1',
          fahrzeugtypId: validFahrzeugtypId,
          baujahr: Number.NaN, // Korrupte DB-Daten
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammFahrzeug.reconstitute(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Korruptes Baujahr in DB-Daten');
        expect(result.error).toContain('Baujahr muss eine ganze Zahl sein');
      });
    });
  });

  describe('fahrzeugtypId immutability', () => {
    it('should NOT allow changing fahrzeugtypId after creation', () => {
      // Given (Arrange)
      const createProps: CreateStammFahrzeugProps = {
        rufname: 'RTW 1',
        funkrufname: 'Florian Musterstadt 1/46/1',
        fahrzeugtypId: validFahrzeugtypId,
        createdBy: validCreatedBy,
      };
      const stammFahrzeug = StammFahrzeug.create(createProps).value!;
      const originalFahrzeugtypId = stammFahrzeug.fahrzeugtypId;

      // Then (Assert) - fahrzeugtypId ist readonly, update() hat kein fahrzeugtypId Parameter
      // Update sollte alle anderen Felder erlauben
      const updateProps: UpdateStammFahrzeugProps = {
        rufname: 'RTW 1-1',
        funkrufname: 'Florian Musterstadt 1/46/1-1',
        kennzeichen: 'DA-RK 102',
        baujahr: 2021,
        funkkenungBOS: 'BOS-67890',
        updatedBy: validCreatedBy,
      };

      const result = stammFahrzeug.update(updateProps);

      expect(result.isSuccess).toBe(true);
      expect(stammFahrzeug.fahrzeugtypId).toBe(originalFahrzeugtypId); // IMMUTABLE
      expect(stammFahrzeug.rufname).toBe('RTW 1-1'); // Andere Felder aktualisierbar
    });

    it('should keep fahrzeugtypId unchanged throughout lifecycle', () => {
      // Given (Arrange)
      const createProps: CreateStammFahrzeugProps = {
        rufname: 'RTW 1',
        funkrufname: 'Florian Musterstadt 1/46/1',
        fahrzeugtypId: validFahrzeugtypId,
        createdBy: validCreatedBy,
      };
      const stammFahrzeug = StammFahrzeug.create(createProps).value!;
      const originalFahrzeugtypId = stammFahrzeug.fahrzeugtypId;

      // When (Act) - Multiple updates und archive
      stammFahrzeug.update({ rufname: 'RTW 1-1', updatedBy: validCreatedBy });
      stammFahrzeug.update({ kennzeichen: 'DA-RK 102', updatedBy: validCreatedBy });
      stammFahrzeug.archive(validCreatedBy);

      // Then (Assert)
      expect(stammFahrzeug.fahrzeugtypId).toBe(originalFahrzeugtypId); // Immer noch gleich
      expect(stammFahrzeug.isArchived).toBe(true); // Andere Operations funktionierten
    });
  });
});
