import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityApi } from './security';
import { fetchWithAuth } from '../utils/authInterceptor';
import { mockSecurityAlerts } from './security.mock';

// Mock dependencies
vi.mock('../utils/authInterceptor');

describe.skip('securityApi - Alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock import.meta.env
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_API_URL: 'http://localhost:3000',
        },
      },
    });
  });

  describe('getSecurityAlerts', () => {
    it('should fetch security alerts successfully', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockSecurityAlerts), { ok: true }),
      );

      const result = await securityApi.getSecurityAlerts();

      expect(fetchWithAuth).toHaveBeenCalledWith('/api/security/alerts');
      expect(result).toEqual(mockSecurityAlerts);
    });

    it('should handle alert type transformation', async () => {
      const alertsWithDifferentTypes = [{ ...mockSecurityAlerts[0], type: 'UNKNOWN_TYPE' }];
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(alertsWithDifferentTypes), { ok: true }),
      );

      const result = await securityApi.getSecurityAlerts();

      expect(result[0].type).toBe('SUSPICIOUS_ACTIVITY'); // Default fallback
    });

    it('should handle empty alerts response', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(JSON.stringify([]), { ok: true }));

      const result = await securityApi.getSecurityAlerts();

      expect(result).toEqual([]);
    });

    it('should handle null response', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(JSON.stringify(null), { ok: true }));

      const result = await securityApi.getSecurityAlerts();

      expect(result).toEqual([]);
    });

    it('should handle error responses', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 500, ok: false }));

      await expect(securityApi.getSecurityAlerts()).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch security alerts:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { ok: true }));

      await securityApi.resolveAlert('alert123');

      expect(fetchWithAuth).toHaveBeenCalledWith('/api/security/alerts/alert123/resolve', {
        method: 'POST',
      });
    });

    it('should handle resolve alert errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 404, ok: false }));

      await expect(securityApi.resolveAlert('alert123')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to resolve alert:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
