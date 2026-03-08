// @ts-nocheck
import { FunkStatusConfig, type ReconstituteFunkStatusConfigProps } from '../funk-status-config.aggregate';
import { FunkStatusConfigUpdatedEvent } from '../../events/funk-status-config-updated.event';
import { FUNKSTATUS_ERROR_CODES, FunkStatusError } from '../../common/error-codes';

describe('FunkStatusConfig Aggregate', () => {
  // Helper: Gültiges Reconstitute-Props Set (Status 7 = editierbar)
  const createValidReconstituteProps = (): ReconstituteFunkStatusConfigProps => ({
    id: 'clw3h8x9y0000testid0000001',
    code: 7,
    standardLabel: 'Status 7',
    customLabel: 'Sondereinsatz',
    farbe: '#FF5733',
    istAlarmierbar: true,
    beschreibung: 'Für besondere Einsatzlagen',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-02T14:30:00Z'),
    createdBy: 'clw3h8x9y0000user00000001',
    updatedBy: 'clw3h8x9y0000user00000002',
  });

  describe('reconstitute', () => {
    it('should reconstitute with valid data (editable code 7)', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      const config = result.value!;
      expect(config.code).toBe(7);
      expect(config.standardLabel).toBe('Status 7');
      expect(config.customLabel).toBe('Sondereinsatz');
      expect(config.displayLabel).toBe('Sondereinsatz'); // customLabel überschreibt
      expect(config.farbe).toBe('#FF5733');
      expect(config.istAlarmierbar).toBe(true);
      expect(config.beschreibung).toBe('Für besondere Einsatzlagen');
      expect(config.createdBy).toBe('clw3h8x9y0000user00000001');
      expect(config.updatedBy).toBe('clw3h8x9y0000user00000002');
      expect(config.isEditable).toBe(true); // Code 7 ist editierbar
    });

    it('should reconstitute with read-only code 0', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.code = 0;
      props.standardLabel = 'Einsatzbereit FMS';

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const config = result.value!;
      expect(config.code).toBe(0);
      expect(config.isEditable).toBe(false); // Code 0 ist read-only
    });

    it('should use standardLabel as displayLabel when customLabel is undefined', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.customLabel = undefined;

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const config = result.value!;
      expect(config.customLabel).toBeUndefined();
      expect(config.displayLabel).toBe('Status 7'); // Fallback zu standardLabel
    });

    it('should convert empty customLabel to undefined', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.customLabel = '   '; // Nur Whitespace

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const config = result.value!;
      expect(config.customLabel).toBeUndefined();
      expect(config.displayLabel).toBe('Status 7');
    });

    it('should trim all string fields', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.standardLabel = '  Status 7  ';
      props.customLabel = '  Sondereinsatz  ';
      props.beschreibung = '  Beschreibung  ';
      props.farbe = '  #FF5733  ';
      props.createdBy = '  clw3h8x9y0000user00000001  ';
      props.updatedBy = '  clw3h8x9y0000user00000002  ';

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const config = result.value!;
      expect(config.standardLabel).toBe('Status 7');
      expect(config.customLabel).toBe('Sondereinsatz');
      expect(config.beschreibung).toBe('Beschreibung');
      expect(config.farbe).toBe('#FF5733');
      expect(config.createdBy).toBe('clw3h8x9y0000user00000001');
      expect(config.updatedBy).toBe('clw3h8x9y0000user00000002');
    });

    it('should fail with invalid ID', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.id = 'invalid-id';

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Ungültige ID');
    });

    it('should fail with non-integer code', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.code = 7.5; // Float statt Integer

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Code muss eine ganze Zahl sein');
    });

    it('should fail with code < 0', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.code = -1;

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('[FUNKSTATUS_CODE_OUT_OF_RANGE]');
      expect(FunkStatusError.hasCode(result.error!, FUNKSTATUS_ERROR_CODES.CODE_OUT_OF_RANGE)).toBe(true);
    });

    it('should fail with code > 9', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.code = 10;

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('[FUNKSTATUS_CODE_OUT_OF_RANGE]');
      expect(FunkStatusError.hasCode(result.error!, FUNKSTATUS_ERROR_CODES.CODE_OUT_OF_RANGE)).toBe(true);
    });

    it('should fail with invalid color format', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.farbe = 'invalid-color';

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('[FUNKSTATUS_INVALID_COLOR_FORMAT]');
      expect(FunkStatusError.hasCode(result.error!, FUNKSTATUS_ERROR_CODES.INVALID_COLOR_FORMAT)).toBe(true);
    });

    it('should fail with invalid createdBy (not CUID)', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.createdBy = 'invalid-user-id';

      // When (Act)
      const result = FunkStatusConfig.reconstitute(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('createdBy muss ein gültiger CUID2-Identifier sein');
    });
  });

  describe('update', () => {
    let config: FunkStatusConfig;

    beforeEach(() => {
      // Given (Arrange): Editierbaren Status erstellen (Code 7)
      const props = createValidReconstituteProps();
      const result = FunkStatusConfig.reconstitute(props);
      config = result.value!;
      config.clearDomainEvents(); // Reset Events von reconstitute
    });

    it('should update customLabel successfully', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        customLabel: 'Neues Label',
        updatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(config.customLabel).toBe('Neues Label');
      expect(config.displayLabel).toBe('Neues Label');
      expect(config.updatedBy).toBe(updatedBy);

      const events = config.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(FunkStatusConfigUpdatedEvent);
      const event = events[0] as FunkStatusConfigUpdatedEvent;
      expect(event.code).toBe(7);
      expect(event.changes.customLabel).toBe('Neues Label');
      expect(event.updatedBy).toBe(updatedBy);
    });

    it('should update farbe successfully', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        farbe: '#00FF00',
        updatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(config.farbe).toBe('#00FF00');
    });

    it('should update istAlarmierbar successfully', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        istAlarmierbar: false,
        updatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(config.istAlarmierbar).toBe(false);
    });

    it('should update beschreibung successfully', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        beschreibung: 'Neue Beschreibung',
        updatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(config.beschreibung).toBe('Neue Beschreibung');
    });

    it('should update multiple fields at once', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        customLabel: 'Multi Update',
        farbe: '#0000FF',
        istAlarmierbar: false,
        beschreibung: 'Mehrere Änderungen',
        updatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(config.customLabel).toBe('Multi Update');
      expect(config.farbe).toBe('#0000FF');
      expect(config.istAlarmierbar).toBe(false);
      expect(config.beschreibung).toBe('Mehrere Änderungen');

      const events = config.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as FunkStatusConfigUpdatedEvent;
      expect(event.changes.customLabel).toBe('Multi Update');
      expect(event.changes.farbe).toBe('#0000FF');
      expect(event.changes.istAlarmierbar).toBe(false);
      expect(event.changes.beschreibung).toBe('Mehrere Änderungen');
    });

    it('should clear customLabel when empty string', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        customLabel: '   ', // Nur Whitespace
        updatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(config.customLabel).toBeUndefined();
      expect(config.displayLabel).toBe('Status 7'); // Fallback zu standardLabel
    });

    it('should clear farbe when empty string', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        farbe: '   ', // Nur Whitespace
        updatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(config.farbe).toBeUndefined();
    });

    it('should fail update for read-only code 0', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.code = 0; // Read-Only Status
      const readOnlyConfig = FunkStatusConfig.reconstitute(props).value!;
      readOnlyConfig.clearDomainEvents();

      // When (Act)
      const result = readOnlyConfig.update({
        customLabel: 'Sollte nicht erlaubt sein',
        updatedBy: 'clw3h8x9y0000user00000003',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('[FUNKSTATUS_CODE_READ_ONLY]');
      expect(FunkStatusError.hasCode(result.error!, FUNKSTATUS_ERROR_CODES.CODE_READ_ONLY)).toBe(true);
      expect(readOnlyConfig.getDomainEvents()).toHaveLength(0); // Kein Event emittiert
    });

    it('should fail update for read-only code 6', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.code = 6; // Read-Only Status
      const readOnlyConfig = FunkStatusConfig.reconstitute(props).value!;

      // When (Act)
      const result = readOnlyConfig.update({
        customLabel: 'Sollte nicht erlaubt sein',
        updatedBy: 'clw3h8x9y0000user00000003',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(FunkStatusError.hasCode(result.error!, FUNKSTATUS_ERROR_CODES.CODE_READ_ONLY)).toBe(true);
    });

    it('should allow update for editable code 8', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.code = 8; // Editierbarer Status
      const editableConfig = FunkStatusConfig.reconstitute(props).value!;
      editableConfig.clearDomainEvents();

      // When (Act)
      const result = editableConfig.update({
        customLabel: 'Status 8 Update',
        updatedBy: 'clw3h8x9y0000user00000003',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(editableConfig.customLabel).toBe('Status 8 Update');
    });

    it('should allow update for editable code 9', () => {
      // Given (Arrange)
      const props = createValidReconstituteProps();
      props.code = 9; // Editierbarer Status
      const editableConfig = FunkStatusConfig.reconstitute(props).value!;
      editableConfig.clearDomainEvents();

      // When (Act)
      const result = editableConfig.update({
        customLabel: 'Status 9 Update',
        updatedBy: 'clw3h8x9y0000user00000003',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(editableConfig.customLabel).toBe('Status 9 Update');
    });

    it('should fail with invalid color format', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        farbe: 'not-a-hex-color',
        updatedBy,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('[FUNKSTATUS_INVALID_COLOR_FORMAT]');
      expect(FunkStatusError.hasCode(result.error!, FUNKSTATUS_ERROR_CODES.INVALID_COLOR_FORMAT)).toBe(true);
    });

    it('should fail with missing updatedBy', () => {
      // Given (Arrange)
      // When (Act)
      const result = config.update({
        customLabel: 'Test',
        updatedBy: '', // Leer
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('updatedBy ist erforderlich für Audit-Trail');
    });

    it('should fail with invalid updatedBy (not CUID)', () => {
      // Given (Arrange)
      // When (Act)
      const result = config.update({
        customLabel: 'Test',
        updatedBy: 'invalid-user-id',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('updatedBy muss ein gültiger CUID2-Identifier sein');
    });

    it('should not emit event when no changes', () => {
      // Given (Arrange)
      const updatedBy = 'clw3h8x9y0000user00000003';

      // When (Act)
      const result = config.update({
        updatedBy, // Nur updatedBy, keine Änderungen
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(config.getDomainEvents()).toHaveLength(0); // Kein Event
    });
  });
});
