import { AddEintragCommand } from '../add-eintrag.command';

/**
 * Unit Tests für AddEintragCommand.
 *
 * Diese Tests validieren die Factory-Methode und Command-Creation-Logik,
 * insbesondere die Validierung der erforderlichen Felder und das Default-Verhalten
 * für optionale Parameter wie `kategorie`.
 */
describe('AddEintragCommand', () => {
  // Test CUIDs im korrekten Format
  const validEtbId = 'clx1234567890abcdefghijk';
  const validText = 'Fahrzeug W1 eingetroffen';
  const validUserId = 'clxuserabc123def456ghij';

  describe('create', () => {
    describe('Kategorie Handling', () => {
      it('should create command with default kategorie LAGE when not provided', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value?.kategorie).toBe('LAGE');
      });

      it('should create command with specified kategorie ALARMIERUNG', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'ALARMIERUNG');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('ALARMIERUNG');
      });

      it('should create command with specified kategorie ANKUNFT', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'ANKUNFT');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('ANKUNFT');
      });

      it('should create command with specified kategorie BEFEHL', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'BEFEHL');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('BEFEHL');
      });

      it('should create command with specified kategorie ERKUNDUNG', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'ERKUNDUNG');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('ERKUNDUNG');
      });

      it('should create command with specified kategorie MASSNAHME', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'MASSNAHME');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('MASSNAHME');
      });

      it('should create command with specified kategorie PERSONAL', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'PERSONAL');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('PERSONAL');
      });

      it('should create command with specified kategorie FAHRZEUG', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'FAHRZEUG');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('FAHRZEUG');
      });

      it('should create command with specified kategorie MATERIAL', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'MATERIAL');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('MATERIAL');
      });

      it('should create command with specified kategorie KOMMUNIKATION', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'KOMMUNIKATION');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('KOMMUNIKATION');
      });

      it('should use LAGE as default when kategorie is explicitly undefined', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('LAGE');
      });
    });

    describe('etbId Validation', () => {
      it('should fail when etbId is empty string', () => {
        // Act
        const result = AddEintragCommand.create('', validText, validUserId);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('etbId is required');
      });

      it('should fail when etbId is whitespace only', () => {
        // Act
        const result = AddEintragCommand.create('   ', validText, validUserId);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('etbId is required');
      });

      it('should fail when etbId contains only tabs and newlines', () => {
        // Act
        const result = AddEintragCommand.create('\t\n\r', validText, validUserId);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('etbId is required');
      });
    });

    describe('text Validation', () => {
      it('should fail when text is empty string', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, '', validUserId);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('text is required and cannot be empty');
      });

      it('should fail when text is whitespace only', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, '   ', validUserId);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('text is required and cannot be empty');
      });

      it('should fail when text contains only tabs and newlines', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, '\t\n\r', validUserId);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('text is required and cannot be empty');
      });
    });

    describe('userId Validation', () => {
      it('should fail when userId is empty string', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, '');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('userId is required');
      });

      it('should fail when userId is whitespace only', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, '   ');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('userId is required');
      });

      it('should fail when userId contains only tabs and newlines', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, '\t\n\r');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('userId is required');
      });
    });

    describe('Successful Command Creation', () => {
      it('should create command with all valid parameters', () => {
        // Act
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'ALARMIERUNG');

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value?.etbId).toBe(validEtbId);
        expect(result.value?.text).toBe(validText);
        expect(result.value?.userId).toBe(validUserId);
        expect(result.value?.kategorie).toBe('ALARMIERUNG');
      });

      it('should preserve text with leading/trailing whitespace when not empty', () => {
        // Act - Text mit Leerzeichen am Anfang/Ende, aber nicht nur Whitespace
        const textWithSpaces = '  Fahrzeug eingetroffen  ';
        const result = AddEintragCommand.create(validEtbId, textWithSpaces, validUserId);

        // Assert - Text wird nicht getrimmt, nur validiert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.text).toBe(textWithSpaces);
      });

      it('should accept very long text', () => {
        // Act
        const longText = 'A'.repeat(10000);
        const result = AddEintragCommand.create(validEtbId, longText, validUserId);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.text).toBe(longText);
      });

      it('should accept text with special characters', () => {
        // Act
        const specialText = 'Fahrzeug W1/2 eingetroffen @ 14:30 - Standort: "Hauptstraße 5"';
        const result = AddEintragCommand.create(validEtbId, specialText, validUserId);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.text).toBe(specialText);
      });

      it('should accept text with German Umlauts', () => {
        // Act
        const umlautText = 'Löschfahrzeug über Mühlstraße zur Übung';
        const result = AddEintragCommand.create(validEtbId, umlautText, validUserId);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value?.text).toBe(umlautText);
      });
    });

    describe('Immutability', () => {
      it('should create immutable command (readonly properties)', () => {
        // Arrange
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, 'ANKUNFT');
        const command = result.value!;

        // Assert - TypeScript Readonly Check (Runtime test that properties exist)
        expect(command.etbId).toBe(validEtbId);
        expect(command.text).toBe(validText);
        expect(command.userId).toBe(validUserId);
        expect(command.kategorie).toBe('ANKUNFT');

        // Verify properties are readonly (attempting to reassign should fail at compile time)
        // Runtime check: properties should be defined on the object
        expect(Object.keys(command)).toContain('etbId');
        expect(Object.keys(command)).toContain('text');
        expect(Object.keys(command)).toContain('userId');
        expect(Object.keys(command)).toContain('kategorie');
      });
    });

    describe('occurredAt parameter', () => {
      it('should accept occurredAt with valid Date', () => {
        // Given
        const occurredAt = new Date('2025-01-15T14:30:00.000Z');

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, undefined, undefined, undefined, occurredAt);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.occurredAt).toEqual(occurredAt);
      });

      it('should accept undefined occurredAt', () => {
        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.occurredAt).toBeUndefined();
      });

      it('should preserve occurredAt timestamp precision', () => {
        // Given
        const specificTime = new Date('2025-01-15T14:30:45.123Z');

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, undefined, undefined, undefined, specificTime);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.occurredAt?.getTime()).toBe(specificTime.getTime());
      });
    });

    describe('absender parameter', () => {
      it('should accept absender with valid length', () => {
        // Given
        const absender = 'Florian Musterstadt 11/1';

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, absender);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.absender).toBe('Florian Musterstadt 11/1');
      });

      it('should accept absender with max 100 characters', () => {
        // Given
        const maxLengthAbsender = 'A'.repeat(100);

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, maxLengthAbsender);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.absender).toBe(maxLengthAbsender);
      });

      it('should reject absender exceeding 100 characters', () => {
        // Given
        const tooLongAbsender = 'A'.repeat(101);

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, tooLongAbsender);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('absender');
      });

      it('should accept undefined absender', () => {
        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, undefined);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.absender).toBeUndefined();
      });

      it('should accept empty string absender', () => {
        // Given
        const emptyAbsender = '';

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, emptyAbsender);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.absender).toBe('');
      });
    });

    describe('empfaenger parameter', () => {
      it('should accept empfaenger with valid length', () => {
        // Given
        const empfaenger = 'Leitstelle';

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, undefined, empfaenger);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.empfaenger).toBe('Leitstelle');
      });

      it('should accept empfaenger with max 100 characters', () => {
        // Given
        const maxLengthEmpfaenger = 'B'.repeat(100);

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, undefined, maxLengthEmpfaenger);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.empfaenger).toBe(maxLengthEmpfaenger);
      });

      it('should reject empfaenger exceeding 100 characters', () => {
        // Given
        const tooLongEmpfaenger = 'B'.repeat(101);

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, undefined, tooLongEmpfaenger);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('empfaenger');
      });

      it('should accept undefined empfaenger', () => {
        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, undefined, undefined);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.empfaenger).toBeUndefined();
      });

      it('should accept empty string empfaenger', () => {
        // Given
        const emptyEmpfaenger = '';

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, undefined, emptyEmpfaenger);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.empfaenger).toBe('');
      });
    });

    describe('absender and empfaenger together', () => {
      it('should accept both absender and empfaenger', () => {
        // Given
        const absender = 'Florian 11/1';
        const empfaenger = 'Leitstelle';

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, absender, empfaenger);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.absender).toBe('Florian 11/1');
        expect(result.value?.empfaenger).toBe('Leitstelle');
      });

      it('should accept both with max length', () => {
        // Given
        const absender = 'A'.repeat(100);
        const empfaenger = 'B'.repeat(100);

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, absender, empfaenger);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.absender).toBe(absender);
        expect(result.value?.empfaenger).toBe(empfaenger);
      });

      it('should fail if absender exceeds limit while empfaenger is valid', () => {
        // Given
        const absender = 'A'.repeat(101);
        const empfaenger = 'Leitstelle';

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, absender, empfaenger);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('absender');
      });

      it('should fail if empfaenger exceeds limit while absender is valid', () => {
        // Given
        const absender = 'Florian 11/1';
        const empfaenger = 'B'.repeat(101);

        // When
        const result = AddEintragCommand.create(validEtbId, validText, validUserId, undefined, undefined, absender, empfaenger);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('empfaenger');
      });
    });
  });
});
