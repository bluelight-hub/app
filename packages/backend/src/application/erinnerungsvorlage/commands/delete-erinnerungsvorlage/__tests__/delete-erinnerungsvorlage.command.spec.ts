import { DeleteErinnerungsvorlageCommand } from '../delete-erinnerungsvorlage.command';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../../errors/erinnerungsvorlage-error.codes';

describe('DeleteErinnerungsvorlageCommand', () => {
  describe('create', () => {
    it('should create command successfully', () => {
      const result = DeleteErinnerungsvorlageCommand.create({
        vorlageId: 'valid-id',
        deletedBy: 'user-id',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.vorlageId).toBe('valid-id');
      expect(result.value!.deletedBy).toBe('user-id');
    });

    it('should fail when vorlageId is empty', () => {
      const result = DeleteErinnerungsvorlageCommand.create({
        vorlageId: '',
        deletedBy: 'user-id',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    });

    it('should fail when vorlageId is whitespace only', () => {
      const result = DeleteErinnerungsvorlageCommand.create({
        vorlageId: '   ',
        deletedBy: 'user-id',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    });

    it('should fail when deletedBy is empty', () => {
      const result = DeleteErinnerungsvorlageCommand.create({
        vorlageId: 'valid-id',
        deletedBy: '',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.CREATED_BY_REQUIRED);
    });

    it('should fail when deletedBy is whitespace only', () => {
      const result = DeleteErinnerungsvorlageCommand.create({
        vorlageId: 'valid-id',
        deletedBy: '   ',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(ERINNERUNGSVORLAGE_ERROR_CODES.CREATED_BY_REQUIRED);
    });

    it('should trim vorlageId and deletedBy', () => {
      const result = DeleteErinnerungsvorlageCommand.create({
        vorlageId: '  valid-id  ',
        deletedBy: '  user-id  ',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.vorlageId).toBe('valid-id');
      expect(result.value!.deletedBy).toBe('user-id');
    });
  });
});
