import { ExportErinnerungenQuery } from '../export-erinnerungen.query';

describe('ExportErinnerungenQuery', () => {
  const VALID_EINSATZ_ID = 'clw3h8x9y000108l6d8888888';

  it('should accept valid einsatzId and pdf format', () => {
    // Given
    const props = { einsatzId: VALID_EINSATZ_ID, format: 'pdf' };

    // When
    const result = ExportErinnerungenQuery.create(props);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.einsatzId).toBe(VALID_EINSATZ_ID);
    expect(result.value!.format).toBe('pdf');
  });

  it('should accept valid einsatzId and csv format', () => {
    // Given
    const props = { einsatzId: VALID_EINSATZ_ID, format: 'csv' };

    // When
    const result = ExportErinnerungenQuery.create(props);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.einsatzId).toBe(VALID_EINSATZ_ID);
    expect(result.value!.format).toBe('csv');
  });

  it('should accept valid einsatzId and json format', () => {
    // Given
    const props = { einsatzId: VALID_EINSATZ_ID, format: 'json' };

    // When
    const result = ExportErinnerungenQuery.create(props);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.einsatzId).toBe(VALID_EINSATZ_ID);
    expect(result.value!.format).toBe('json');
  });

  it('should reject empty einsatzId', () => {
    // Given
    const props = { einsatzId: '', format: 'pdf' };

    // When
    const result = ExportErinnerungenQuery.create(props);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toBeDefined();
  });

  it('should reject invalid einsatzId format', () => {
    // Given
    const props = { einsatzId: 'INVALID-FORMAT!', format: 'csv' };

    // When
    const result = ExportErinnerungenQuery.create(props);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toBeDefined();
  });

  it('should reject invalid export format', () => {
    // Given
    const props = { einsatzId: VALID_EINSATZ_ID, format: 'xlsx' };

    // When
    const result = ExportErinnerungenQuery.create(props);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ERINNERUNG_EXPORT_FORMAT_INVALID');
  });

  it('should be case-insensitive for format', () => {
    // Given
    const props = { einsatzId: VALID_EINSATZ_ID, format: 'PDF' };

    // When
    const result = ExportErinnerungenQuery.create(props);

    // Then
    expect(result.isSuccess).toBe(true);
    expect(result.value!.format).toBe('pdf');
  });
});
