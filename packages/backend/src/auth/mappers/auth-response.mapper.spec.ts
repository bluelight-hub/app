import { toLogoutResponseDto, toRefreshResponseDto } from '@/auth/mappers/auth-response.mapper';

describe('AuthResponseMapper', () => {
  describe('toLogoutResponseDto', () => {
    it('should return correct logout response message', () => {
      const result = toLogoutResponseDto();

      expect(result).toEqual({
        message: 'Erfolgreich abgemeldet',
      });
    });

    it('should return consistent response on multiple calls', () => {
      const result1 = toLogoutResponseDto();
      const result2 = toLogoutResponseDto();

      expect(result1).toEqual(result2);
    });

    it('should return object with message property', () => {
      const result = toLogoutResponseDto();

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });
  });

  describe('toRefreshResponseDto', () => {
    it('should return success: true', () => {
      const result = toRefreshResponseDto();

      expect(result).toEqual({
        success: true,
      });
    });

    it('should return consistent response on multiple calls', () => {
      const result1 = toRefreshResponseDto();
      const result2 = toRefreshResponseDto();

      expect(result1).toEqual(result2);
    });

    it('should return object with success property', () => {
      const result = toRefreshResponseDto();

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(true);
    });
  });
});
