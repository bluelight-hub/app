import { AuthResponseMapper } from './auth-response.mapper';

describe('AuthResponseMapper', () => {
  describe('toLogoutResponseDto', () => {
    it('should return correct logout response message', () => {
      const result = AuthResponseMapper.toLogoutResponseDto();

      expect(result).toEqual({
        message: 'Erfolgreich abgemeldet',
      });
    });

    it('should return consistent response on multiple calls', () => {
      const result1 = AuthResponseMapper.toLogoutResponseDto();
      const result2 = AuthResponseMapper.toLogoutResponseDto();

      expect(result1).toEqual(result2);
    });

    it('should return object with message property', () => {
      const result = AuthResponseMapper.toLogoutResponseDto();

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });
  });

  describe('toRefreshResponseDto', () => {
    it('should return success: true', () => {
      const result = AuthResponseMapper.toRefreshResponseDto();

      expect(result).toEqual({
        success: true,
      });
    });

    it('should return consistent response on multiple calls', () => {
      const result1 = AuthResponseMapper.toRefreshResponseDto();
      const result2 = AuthResponseMapper.toRefreshResponseDto();

      expect(result1).toEqual(result2);
    });

    it('should return object with success property', () => {
      const result = AuthResponseMapper.toRefreshResponseDto();

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(true);
    });
  });
});
