import { CreateErinnerungsvorlageCommand } from '../create-erinnerungsvorlage.command';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../../errors/erinnerungsvorlage-error.codes';

/**
 * Unit Tests für CreateErinnerungsvorlageCommand.
 *
 * Testet die Command Factory Method Validierung gemäß AAA Pattern mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - Erfolgreiche Erstellung mit allen Feldern
 * - Erfolgreiche Erstellung mit Pflichtfeldern only
 * - Titel Validierung (leer, zu lang, Trimming)
 * - Minuten Validierung (< 1)
 * - CreatedBy Validierung (leer)
 * - Beschreibung Validierung (zu lang)
 */
describe('CreateErinnerungsvorlageCommand', () => {
  describe('create', () => {
    it('should create command successfully with all fields', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Lagebesprechung',
        minuten: 30,
        beschreibung: 'Regelmäßige Lagebesprechung im ELW',
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.titel).toBe('Lagebesprechung');
      expect(result.value!.minuten).toBe(30);
      expect(result.value!.beschreibung).toBe('Regelmäßige Lagebesprechung im ELW');
      expect(result.value!.createdBy).toBe('admin-user');
    });

    it('should create command successfully with required fields only', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Ablösung',
        minuten: 60,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.titel).toBe('Ablösung');
      expect(result.value!.minuten).toBe(60);
      expect(result.value!.beschreibung).toBeUndefined();
      expect(result.value!.createdBy).toBe('admin-user');
    });

    it('should fail when titel is empty', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: '',
        minuten: 30,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_REQUIRED);
    });

    it('should fail when titel exceeds max length (>100 Zeichen)', () => {
      // Given & When (Arrange & Act)
      const tooLongTitel = 'A'.repeat(101);
      const result = CreateErinnerungsvorlageCommand.create({
        titel: tooLongTitel,
        minuten: 30,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_TOO_LONG);
    });

    it('should fail when minuten is less than 1', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: 0,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.MINUTEN_INVALID);
    });

    it('should fail when minuten is negative', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: -5,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.MINUTEN_INVALID);
    });

    it('should fail when createdBy is empty', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: 30,
        createdBy: '',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.CREATED_BY_REQUIRED);
    });

    it('should fail when createdBy is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: 30,
        createdBy: '   ',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.CREATED_BY_REQUIRED);
    });

    it('should fail when beschreibung exceeds max length (>500 Zeichen)', () => {
      // Given & When (Arrange & Act)
      const tooLongBeschreibung = 'B'.repeat(501);
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: 30,
        beschreibung: tooLongBeschreibung,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.BESCHREIBUNG_TOO_LONG);
    });

    it('should trim titel whitespace', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: '  Lagebesprechung  ',
        minuten: 30,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.titel).toBe('Lagebesprechung');
    });

    it('should fail when titel is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: '   ',
        minuten: 30,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_REQUIRED);
    });

    it('should accept titel with exactly 100 characters', () => {
      // Given & When (Arrange & Act)
      const maxTitel = 'A'.repeat(100);
      const result = CreateErinnerungsvorlageCommand.create({
        titel: maxTitel,
        minuten: 30,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.titel).toBe(maxTitel);
    });

    it('should accept minuten of exactly 1', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: 1,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.minuten).toBe(1);
    });

    it('should trim beschreibung whitespace and treat empty as undefined', () => {
      // Given & When (Arrange & Act)
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: 30,
        beschreibung: '   ',
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBeUndefined();
    });

    it('should accept beschreibung with exactly 500 characters', () => {
      // Given & When (Arrange & Act)
      const maxBeschreibung = 'B'.repeat(500);
      const result = CreateErinnerungsvorlageCommand.create({
        titel: 'Test Vorlage',
        minuten: 30,
        beschreibung: maxBeschreibung,
        createdBy: 'admin-user',
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBe(maxBeschreibung);
    });
  });
});
