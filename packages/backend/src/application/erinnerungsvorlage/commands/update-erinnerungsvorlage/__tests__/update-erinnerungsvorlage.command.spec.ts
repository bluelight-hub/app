import { UpdateErinnerungsvorlageCommand } from '../update-erinnerungsvorlage.command';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../../errors/erinnerungsvorlage-error.codes';

describe('UpdateErinnerungsvorlageCommand', () => {
  const validVorlageId = 'clw3h8x9y0000qwertyuiopas';
  const validUpdatedBy = 'user_admin123';

  describe('create', () => {
    it('should create command successfully with all fields', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        titel: 'Neuer Titel',
        minuten: 45,
        beschreibung: 'Neue Beschreibung',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.vorlageId).toBe(validVorlageId);
      expect(result.value!.titel).toBe('Neuer Titel');
      expect(result.value!.minuten).toBe(45);
      expect(result.value!.beschreibung).toBe('Neue Beschreibung');
    });

    it('should create command with only titel', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        titel: 'Nur Titel',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.titel).toBe('Nur Titel');
      expect(result.value!.minuten).toBeUndefined();
      expect(result.value!.beschreibung).toBeUndefined();
    });

    it('should create command with only minuten', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        minuten: 60,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.minuten).toBe(60);
    });

    it('should create command with beschreibung set to null (remove)', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        beschreibung: null,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBeNull();
    });

    it('should fail when no fields are provided', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.NO_CHANGES);
    });

    it('should fail when vorlageId is empty', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: '',
        updatedBy: validUpdatedBy,
        titel: 'Test',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    });

    it('should fail when titel is empty string', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        titel: '',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_REQUIRED);
    });

    it('should fail when titel exceeds max length', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        titel: 'A'.repeat(101),
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_TOO_LONG);
    });

    it('should fail when minuten is less than 1', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        minuten: 0,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.MINUTEN_INVALID);
    });

    it('should fail when beschreibung exceeds max length', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        beschreibung: 'B'.repeat(501),
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.BESCHREIBUNG_TOO_LONG);
    });

    it('should trim titel whitespace', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        titel: '  Trimmed  ',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.titel).toBe('Trimmed');
    });

    it('should accept titel with exactly 100 characters', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        titel: 'A'.repeat(100),
      });

      expect(result.isSuccess).toBe(true);
    });

    it('should accept minuten of exactly 1', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        minuten: 1,
      });

      expect(result.isSuccess).toBe(true);
    });

    it('should convert empty beschreibung to null', () => {
      const result = UpdateErinnerungsvorlageCommand.create({
        vorlageId: validVorlageId,
        updatedBy: validUpdatedBy,
        beschreibung: '   ',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBeNull();
    });
  });
});
