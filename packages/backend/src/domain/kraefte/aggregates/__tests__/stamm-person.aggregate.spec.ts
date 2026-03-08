// @ts-nocheck
import { StammPerson, type CreateStammPersonProps, type UpdateStammPersonProps, type ReconstituteStammPersonProps } from '../stamm-person.aggregate';
import { STAMM_PERSON_ERROR_CODES } from '../../common/stamm-person-error-codes';
import { StammPersonCreatedEvent } from '../../events/stamm-person-created.event';
import { StammPersonUpdatedEvent } from '../../events/stamm-person-updated.event';

describe('StammPerson Aggregate', () => {
  const validCreatedBy = 'clw3h8x9y0000qwertyuiopas'; // Valid CUID2
  const validQualifikationId = 'clw3h8x9y0000qwertyuiopzz'; // Valid CUID2 for Qualifikation

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    describe('validation', () => {
      it('should fail when vorname is too short', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'A', // Nur 1 Zeichen (min: 2)
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Vorname muss mindestens 2 Zeichen haben');
      });

      it('should fail when vorname is too long', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'A'.repeat(101), // 101 Zeichen (max: 100)
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Vorname darf maximal 100 Zeichen haben');
      });

      it('should fail when nachname is too short', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'M', // Nur 1 Zeichen (min: 2)
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Nachname muss mindestens 2 Zeichen haben');
      });

      it('should fail when nachname is too long', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'A'.repeat(101), // 101 Zeichen (max: 100)
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Nachname darf maximal 100 Zeichen haben');
      });

      it('should fail when personalnummer is too short', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: '', // Leer (min: 1)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Personalnummer muss mindestens 1 Zeichen haben');
      });

      it('should fail when personalnummer is too long', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'A'.repeat(51), // 51 Zeichen (max: 50)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Personalnummer darf maximal 50 Zeichen haben');
      });

      it('should fail when funkkenungBOS is too long', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          funkkenungBOS: 'A'.repeat(51), // 51 Zeichen (max: 50)
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('BOS-Funkkennung darf maximal 50 Zeichen haben');
      });

      it('should fail when createdBy is not a valid CUID', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: 'invalid-cuid',
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when qualifikationIds contains invalid CUID', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          qualifikationIds: ['invalid-cuid', validQualifikationId],
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Ungültige Qualifikation-ID');
        expect(result.error).toContain('invalid-cuid');
      });

      it('should fail when qualifikationIds contains duplicates', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          qualifikationIds: [validQualifikationId, validQualifikationId], // Duplikat
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Qualifikation-IDs enthalten Duplikate');
      });
    });

    describe('success', () => {
      it('should create stamm-person successfully with valid data', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          funkkenungBOS: 'BOS-54321',
          qualifikationIds: [validQualifikationId],
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value?.vorname).toBe('Max');
        expect(result.value?.nachname).toBe('Mustermann');
        expect(result.value?.personalnummer).toBe('P-12345');
        expect(result.value?.funkkenungBOS).toBe('BOS-54321');
        expect(result.value?.qualifikationIds).toEqual([validQualifikationId]);
        expect(result.value?.createdBy).toBe(validCreatedBy);
        expect(result.value?.isArchived).toBe(false);
      });

      it('should create stamm-person without optional fields', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
          // Keine funkkenungBOS, qualifikationIds
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.funkkenungBOS).toBeUndefined();
        expect(result.value?.qualifikationIds).toEqual([]);
      });

      it('should trim whitespace from string fields', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: '  Max  ',
          nachname: '  Mustermann  ',
          personalnummer: '  P-12345  ',
          funkkenungBOS: '  BOS-54321  ',
          createdBy: `  ${validCreatedBy}  `,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.vorname).toBe('Max');
        expect(result.value?.nachname).toBe('Mustermann');
        expect(result.value?.personalnummer).toBe('P-12345');
        expect(result.value?.funkkenungBOS).toBe('BOS-54321');
        expect(result.value?.createdBy).toBe(validCreatedBy);
      });

      it('should convert empty string to undefined for optional fields', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          funkkenungBOS: '   ', // Nur Whitespace
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(result.value?.funkkenungBOS).toBeUndefined();
      });
    });

    describe('domain events', () => {
      it('should emit StammPersonCreatedEvent on successful creation', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const stammPerson = result.value!;
        const events = stammPerson.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StammPersonCreatedEvent);

        const event = events[0] as StammPersonCreatedEvent;
        expect(event.stammPersonId).toBe(stammPerson.id.value);
        expect(event.vorname).toBe('Max');
        expect(event.nachname).toBe('Mustermann');
        expect(event.personalnummer).toBe('P-12345');
        expect(event.createdBy).toBe(validCreatedBy);
      });

      it('should not emit event when creation fails', () => {
        // Given (Arrange)
        const props: CreateStammPersonProps = {
          vorname: 'A', // Ungültig (zu kurz)
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };

        // When (Act)
        const result = StammPerson.create(props);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.value).toBeUndefined();
      });
    });
  });

  describe('update()', () => {
    describe('success', () => {
      it('should update stamm-person successfully', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;

        const updateProps: UpdateStammPersonProps = {
          vorname: 'Maximilian',
          nachname: 'Musterfrau',
          funkkenungBOS: 'BOS-99999',
          qualifikationIds: [validQualifikationId],
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = stammPerson.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(stammPerson.vorname).toBe('Maximilian');
        expect(stammPerson.nachname).toBe('Musterfrau');
        expect(stammPerson.funkkenungBOS).toBe('BOS-99999');
        expect(stammPerson.qualifikationIds).toEqual([validQualifikationId]);
        expect(stammPerson.updatedBy).toBe(validCreatedBy);
      });

      it('should trim whitespace on update', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;

        const updateProps: UpdateStammPersonProps = {
          vorname: '  Maximilian  ',
          nachname: '  Musterfrau  ',
          funkkenungBOS: '  BOS-99999  ',
          updatedBy: `  ${validCreatedBy}  `,
        };

        // When (Act)
        const result = stammPerson.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(stammPerson.vorname).toBe('Maximilian');
        expect(stammPerson.nachname).toBe('Musterfrau');
        expect(stammPerson.funkkenungBOS).toBe('BOS-99999');
        expect(stammPerson.updatedBy).toBe(validCreatedBy);
      });

      it('should allow updating qualifikationIds', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          qualifikationIds: [validQualifikationId],
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;

        const newQualifikationId = 'clw3h8x9y0000qwertyuiopab';
        const updateProps: UpdateStammPersonProps = {
          qualifikationIds: [newQualifikationId], // Vollständiger Ersatz
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = stammPerson.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(stammPerson.qualifikationIds).toEqual([newQualifikationId]);
      });

      it('should convert empty string to undefined for optional fields on update', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          funkkenungBOS: 'BOS-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;

        // When (Act)
        const result = stammPerson.update({
          funkkenungBOS: '   ', // Nur Whitespace
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        expect(stammPerson.funkkenungBOS).toBeUndefined();
      });
    });

    describe('validation', () => {
      it('should fail when vorname is too short on update', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;

        // When (Act)
        const result = stammPerson.update({
          vorname: 'A', // Zu kurz
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Vorname muss mindestens 2 Zeichen haben');
      });

      it('should fail when nachname is too long on update', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;

        // When (Act)
        const result = stammPerson.update({
          nachname: 'A'.repeat(101), // Zu lang
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Nachname darf maximal 100 Zeichen haben');
      });

      it('should fail when updatedBy is not a valid CUID', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;

        // When (Act)
        const result = stammPerson.update({
          vorname: 'Maximilian',
          updatedBy: 'invalid-cuid',
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy muss ein gültiger CUID2-Identifier sein');
      });

      it('should fail when qualifikationIds contains invalid CUID', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;

        // When (Act)
        const result = stammPerson.update({
          qualifikationIds: ['invalid-cuid'],
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Ungültige Qualifikation-ID');
      });
    });

    describe('domain events', () => {
      it('should emit StammPersonUpdatedEvent on successful update', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;
        stammPerson.clearDomainEvents(); // Clear creation event

        const updateProps: UpdateStammPersonProps = {
          vorname: 'Maximilian',
          funkkenungBOS: 'BOS-99999',
          updatedBy: validCreatedBy,
        };

        // When (Act)
        const result = stammPerson.update(updateProps);

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = stammPerson.getDomainEvents();
        expect(events).toHaveLength(1);
        expect(events[0]).toBeInstanceOf(StammPersonUpdatedEvent);

        const event = events[0] as StammPersonUpdatedEvent;
        expect(event.stammPersonId).toBe(stammPerson.id.value);
        expect(event.changes).toEqual({
          vorname: 'Maximilian',
          funkkenungBOS: 'BOS-99999',
        });
        expect(event.updatedBy).toBe(validCreatedBy);
      });

      it('should not emit event when no changes are made', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;
        stammPerson.clearDomainEvents(); // Clear creation event

        // When (Act)
        const result = stammPerson.update({
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isSuccess).toBe(true);
        const events = stammPerson.getDomainEvents();
        expect(events).toHaveLength(0); // Kein Event wenn keine Änderungen
      });

      it('should not emit event when update fails', () => {
        // Given (Arrange)
        const createProps: CreateStammPersonProps = {
          vorname: 'Max',
          nachname: 'Mustermann',
          personalnummer: 'P-12345',
          createdBy: validCreatedBy,
        };
        const stammPerson = StammPerson.create(createProps).value!;
        stammPerson.clearDomainEvents(); // Clear creation event

        // When (Act)
        const result = stammPerson.update({
          vorname: 'A', // Ungültig
          updatedBy: validCreatedBy,
        });

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        const events = stammPerson.getDomainEvents();
        expect(events).toHaveLength(0); // Kein Event bei Fehler
      });
    });
  });

  describe('archive()', () => {
    it('should archive stamm-person successfully', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      expect(stammPerson.isArchived).toBe(false);

      // When (Act)
      const result = stammPerson.archive(validCreatedBy);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(stammPerson.isArchived).toBe(true);
      expect(stammPerson.archivedAt).toBeDefined();
      expect(stammPerson.archivedBy).toBe(validCreatedBy);
      expect(stammPerson.updatedBy).toBe(validCreatedBy);
    });

    it('should fail when archiving already archived person', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      stammPerson.archive(validCreatedBy);
      expect(stammPerson.isArchived).toBe(true);

      // When (Act)
      const result = stammPerson.archive(validCreatedBy);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(STAMM_PERSON_ERROR_CODES.ALREADY_ARCHIVED);
      expect(result.error).toContain('Person ist bereits archiviert');
    });

    it('should fail when archivedBy is not a valid CUID', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;

      // When (Act)
      const result = stammPerson.archive('invalid-cuid');

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('archivedBy muss ein gültiger CUID2-Identifier sein');
    });

    it('should emit StammPersonUpdatedEvent on archive', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      stammPerson.clearDomainEvents(); // Clear creation event

      // When (Act)
      const result = stammPerson.archive(validCreatedBy);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = stammPerson.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(StammPersonUpdatedEvent);

      const event = events[0] as StammPersonUpdatedEvent;
      expect(event.stammPersonId).toBe(stammPerson.id.value);
      expect(event.changes).toEqual({ archived: true });
      expect(event.updatedBy).toBe(validCreatedBy);
    });
  });

  describe('restore()', () => {
    it('should restore archived stamm-person successfully', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      stammPerson.archive(validCreatedBy);
      expect(stammPerson.isArchived).toBe(true);

      // When (Act)
      const result = stammPerson.restore(validCreatedBy);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(stammPerson.isArchived).toBe(false);
      expect(stammPerson.archivedAt).toBeUndefined();
      expect(stammPerson.archivedBy).toBeUndefined();
      expect(stammPerson.updatedBy).toBe(validCreatedBy);
    });

    it('should fail when restoring non-archived person', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      expect(stammPerson.isArchived).toBe(false);

      // When (Act)
      const result = stammPerson.restore(validCreatedBy);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(STAMM_PERSON_ERROR_CODES.NOT_ARCHIVED);
      expect(result.error).toContain('Person ist nicht archiviert und kann daher nicht reaktiviert werden');
    });

    it('should fail when restoredBy is not a valid CUID', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      stammPerson.archive(validCreatedBy);

      // When (Act)
      const result = stammPerson.restore('invalid-cuid');

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('restoredBy muss ein gültiger CUID2-Identifier sein');
    });

    it('should emit StammPersonUpdatedEvent on restore', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      stammPerson.archive(validCreatedBy);
      stammPerson.clearDomainEvents(); // Clear archive event

      // When (Act)
      const result = stammPerson.restore(validCreatedBy);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = stammPerson.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(StammPersonUpdatedEvent);

      const event = events[0] as StammPersonUpdatedEvent;
      expect(event.stammPersonId).toBe(stammPerson.id.value);
      expect(event.changes).toEqual({ archived: false });
      expect(event.updatedBy).toBe(validCreatedBy);
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute stamm-person from database data', () => {
      // Given (Arrange)
      const props: ReconstituteStammPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopas',
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        funkkenungBOS: 'BOS-54321',
        qualifikationIds: [validQualifikationId],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        createdBy: validCreatedBy,
        updatedBy: validCreatedBy,
      };

      // When (Act)
      const result = StammPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.id.value).toBe(props.id);
      expect(result.value?.vorname).toBe('Max');
      expect(result.value?.nachname).toBe('Mustermann');
      expect(result.value?.personalnummer).toBe('P-12345');
      expect(result.value?.funkkenungBOS).toBe('BOS-54321');
      expect(result.value?.qualifikationIds).toEqual([validQualifikationId]);
      expect(result.value?.isArchived).toBe(false);
    });

    it('should reconstitute archived stamm-person', () => {
      // Given (Arrange)
      const props: ReconstituteStammPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopas',
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        qualifikationIds: [],
        archivedAt: new Date('2024-01-15'),
        archivedBy: validCreatedBy,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        createdBy: validCreatedBy,
        updatedBy: validCreatedBy,
      };

      // When (Act)
      const result = StammPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.isArchived).toBe(true);
      expect(result.value?.archivedAt).toEqual(new Date('2024-01-15'));
      expect(result.value?.archivedBy).toBe(validCreatedBy);
    });

    it('should not emit domain events on reconstitute', () => {
      // Given (Arrange)
      const props: ReconstituteStammPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopas',
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        qualifikationIds: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        createdBy: validCreatedBy,
      };

      // When (Act)
      const result = StammPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const stammPerson = result.value!;
      const events = stammPerson.getDomainEvents();
      expect(events).toHaveLength(0); // Keine Events bei reconstitute (historische Daten)
    });

    it('should fail with invalid ID format', () => {
      // Given (Arrange)
      const props: ReconstituteStammPersonProps = {
        id: 'invalid-id-format', // Kein CUID2
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        qualifikationIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: validCreatedBy,
      };

      // When (Act)
      const result = StammPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige ID');
    });

    it('should fail when qualifikationIds contains invalid CUID', () => {
      // Given (Arrange)
      const props: ReconstituteStammPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopas',
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        qualifikationIds: ['invalid-cuid'], // Korrupte DB-Daten
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: validCreatedBy,
      };

      // When (Act)
      const result = StammPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Korrupte Qualifikation-IDs in DB-Daten');
      expect(result.error).toContain('Ungültige Qualifikation-ID');
    });

    it('should trim whitespace from string fields on reconstitute', () => {
      // Given (Arrange)
      const props: ReconstituteStammPersonProps = {
        id: 'clw3h8x9y0000qwertyuiopas',
        vorname: '  Max  ',
        nachname: '  Mustermann  ',
        personalnummer: '  P-12345  ',
        funkkenungBOS: '  BOS-54321  ',
        qualifikationIds: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        createdBy: `  ${validCreatedBy}  `,
        updatedBy: `  ${validCreatedBy}  `,
      };

      // When (Act)
      const result = StammPerson.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.vorname).toBe('Max');
      expect(result.value?.nachname).toBe('Mustermann');
      expect(result.value?.personalnummer).toBe('P-12345');
      expect(result.value?.funkkenungBOS).toBe('BOS-54321');
      expect(result.value?.createdBy).toBe(validCreatedBy);
      expect(result.value?.updatedBy).toBe(validCreatedBy);
    });
  });

  describe('personalnummer immutability', () => {
    it('should NOT allow changing personalnummer after creation', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      const originalPersonalnummer = stammPerson.personalnummer;

      // Then (Assert) - personalnummer ist readonly, update() hat kein personalnummer Parameter
      // Update sollte alle anderen Felder erlauben
      const updateProps: UpdateStammPersonProps = {
        vorname: 'Maximilian',
        nachname: 'Musterfrau',
        funkkenungBOS: 'BOS-99999',
        qualifikationIds: [validQualifikationId],
        updatedBy: validCreatedBy,
      };

      const result = stammPerson.update(updateProps);

      expect(result.isSuccess).toBe(true);
      expect(stammPerson.personalnummer).toBe(originalPersonalnummer); // IMMUTABLE
      expect(stammPerson.vorname).toBe('Maximilian'); // Andere Felder aktualisierbar
    });

    it('should keep personalnummer unchanged throughout lifecycle', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;
      const originalPersonalnummer = stammPerson.personalnummer;

      // When (Act) - Multiple updates und archive
      stammPerson.update({ vorname: 'Maximilian', updatedBy: validCreatedBy });
      stammPerson.update({
        funkkenungBOS: 'BOS-99999',
        updatedBy: validCreatedBy,
      });
      stammPerson.archive(validCreatedBy);

      // Then (Assert)
      expect(stammPerson.personalnummer).toBe(originalPersonalnummer); // Immer noch gleich
      expect(stammPerson.isArchived).toBe(true); // Andere Operations funktionierten
    });
  });

  describe('qualifikationIds array immutability', () => {
    it('should return copy of qualifikationIds array to prevent external mutation', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        qualifikationIds: [validQualifikationId],
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;

      // When (Act) - Try to mutate external array
      const qualIds = stammPerson.qualifikationIds;
      qualIds.push('clw3h8x9y0000qwertyuiopab');

      // Then (Assert)
      expect(stammPerson.qualifikationIds).toEqual([validQualifikationId]); // Unchanged
      expect(stammPerson.qualifikationIds).not.toBe(qualIds); // Different reference
    });

    it('should replace qualifikationIds completely on update', () => {
      // Given (Arrange)
      const qualId1 = validQualifikationId;
      const qualId2 = 'clw3h8x9y0000qwertyuiopab';
      const qualId3 = 'clw3h8x9y0000qwertyuiopac';

      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        qualifikationIds: [qualId1, qualId2],
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;

      // When (Act) - Replace with completely new array
      const result = stammPerson.update({
        qualifikationIds: [qualId3], // Vollständiger Ersatz (nicht Delta!)
        updatedBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(stammPerson.qualifikationIds).toEqual([qualId3]);
      expect(stammPerson.qualifikationIds).not.toContain(qualId1);
      expect(stammPerson.qualifikationIds).not.toContain(qualId2);
    });

    it('should allow clearing qualifikationIds by updating with empty array', () => {
      // Given (Arrange)
      const createProps: CreateStammPersonProps = {
        vorname: 'Max',
        nachname: 'Mustermann',
        personalnummer: 'P-12345',
        qualifikationIds: [validQualifikationId],
        createdBy: validCreatedBy,
      };
      const stammPerson = StammPerson.create(createProps).value!;

      // When (Act)
      const result = stammPerson.update({
        qualifikationIds: [], // Clear all
        updatedBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(stammPerson.qualifikationIds).toEqual([]);
    });
  });
});
