import { ExportRohdatenQuery } from '../export-rohdaten.query';
import { ERINNERUNG_ERROR_CODES } from '../../../errors/erinnerung-error.codes';

describe('ExportRohdatenQuery', () => {
  const validEinsatzId = 'abc123def456ghi789jkl012';
  const validEinsatzNummer = 'E2026-abc123de';

  describe('create', () => {
    it('should create a valid query with csv format', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'csv' });
      expect(result.isSuccess).toBe(true);
      expect(result.value!.einsatzId).toBe(validEinsatzId);
      expect(result.value!.einsatzNummer).toBe(validEinsatzNummer);
      expect(result.value!.format).toBe('csv');
    });

    it('should create a valid query with json format', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'json' });
      expect(result.isSuccess).toBe(true);
      expect(result.value!.format).toBe('json');
    });

    it('should normalize format to lowercase', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'CSV' });
      expect(result.isSuccess).toBe(true);
      expect(result.value!.format).toBe('csv');
    });

    it('should trim einsatzId', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: `  ${validEinsatzId}  `, einsatzNummer: validEinsatzNummer, format: 'csv' });
      expect(result.isSuccess).toBe(true);
      expect(result.value!.einsatzId).toBe(validEinsatzId);
    });

    it('should fail with empty einsatzId', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: '', einsatzNummer: validEinsatzNummer, format: 'csv' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNG_ERROR_CODES.QUERY_EINSATZ_ID_REQUIRED);
    });

    it('should fail with invalid einsatzId (not CUID2)', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: 'invalid-id!', einsatzNummer: validEinsatzNummer, format: 'csv' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    });

    it('should fail with pdf format (not supported for Rohdaten)', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'pdf' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNG_ERROR_CODES.ROHDATEN_EXPORT_FORMAT_INVALID);
    });

    it('should fail with invalid format', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: 'xlsx' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNG_ERROR_CODES.ROHDATEN_EXPORT_FORMAT_INVALID);
    });

    it('should fail with empty format', () => {
      const result = ExportRohdatenQuery.create({ einsatzId: validEinsatzId, einsatzNummer: validEinsatzNummer, format: '' });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNG_ERROR_CODES.ROHDATEN_EXPORT_FORMAT_INVALID);
    });
  });
});
