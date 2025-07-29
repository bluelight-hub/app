import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityApi } from './security';
import { fetchWithAuth } from '../utils/authInterceptor';

// Mock dependencies
vi.mock('../utils/authInterceptor');

describe('securityApi - Dashboard & Alerts', () => {
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

  describe('getDashboardMetrics', () => {
    it('should fetch dashboard metrics for today', async () => {
      const mockResponse = {
        totalLoginAttempts: 100,
        failedLoginAttempts: 10,
        activeSessions: 25,
        suspiciousActivities: 5,
        blockedIPs: 3,
        alertsCount: 8,
        loginAttemptsChart: [],
        threatDistribution: [],
        sessionsByLocation: [],
        avgSessionDuration: 3600,
        securityScore: 85,
        summary: {},
        details: {},
      };

      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await securityApi.getDashboardMetrics('today');

      expect(result).toEqual(mockResponse);
      expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith(
        expect.stringContaining('/v1/api/security/metrics/dashboard'),
      );
    });

    it('should handle week timeRange', async () => {
      const mockResponse = {
        totalLoginAttempts: 500,
        failedLoginAttempts: 50,
        activeSessions: 25,
        suspiciousActivities: 15,
        blockedIPs: 10,
        alertsCount: 30,
        loginAttemptsChart: [],
        threatDistribution: [],
        sessionsByLocation: [],
        avgSessionDuration: 3600,
        securityScore: 75,
      };

      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await securityApi.getDashboardMetrics('week');

      expect(result).toEqual(mockResponse);
      expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith(
        expect.stringContaining('/v1/api/security/metrics/dashboard'),
      );
    });

    it('should handle month timeRange', async () => {
      const mockResponse = {
        totalLoginAttempts: 2000,
        failedLoginAttempts: 200,
        activeSessions: 25,
        suspiciousActivities: 60,
        blockedIPs: 40,
        alertsCount: 120,
        loginAttemptsChart: [],
        threatDistribution: [],
        sessionsByLocation: [],
        avgSessionDuration: 3600,
        securityScore: 70,
      };

      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await securityApi.getDashboardMetrics('month');

      expect(result).toEqual(mockResponse);
      expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith(
        expect.stringContaining('/v1/api/security/metrics/dashboard'),
      );
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(null, { status: 500, statusText: 'Internal Server Error' }),
      );

      const result = await securityApi.getDashboardMetrics('today');

      expect(result).toMatchObject({
        totalLoginAttempts: 0,
        failedLoginAttempts: 0,
        activeSessions: 0,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch dashboard metrics:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('getSecurityAlerts', () => {
    it('should fetch security alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert1',
          type: 'failed_login_attempts',
          severity: 'HIGH',
          message: 'Multiple failed login attempts detected',
          timestamp: new Date().toISOString(),
          metadata: { attempts: 5 },
        },
        {
          id: 'alert2',
          type: 'suspicious_activity',
          severity: 'MEDIUM',
          message: 'Unusual access pattern detected',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      ];

      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(JSON.stringify(mockAlerts), { status: 200 }),
      );

      const result = await securityApi.getSecurityAlerts();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'alert1',
        type: 'failed_login_attempts',
        severity: 'HIGH',
        message: 'Multiple failed login attempts detected',
      });
      expect(result[1]).toMatchObject({
        id: 'alert2',
        type: 'suspicious_activity',
        severity: 'MEDIUM',
        message: 'Unusual access pattern detected',
      });
      expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith('/v1/api/security/alerts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should throw error on failed response', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetchWithAuth).mockResolvedValue(
        new Response(null, { status: 403, statusText: 'Forbidden' }),
      );

      const result = await securityApi.getSecurityAlerts();

      expect(result).toEqual([]);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch security alerts:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', async () => {
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 200 }));

      await expect(securityApi.resolveAlert('alert123')).resolves.toBeUndefined();

      expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith(
        '/api/security/alerts/alert123/resolve',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: undefined,
        },
      );
    });

    it('should throw error on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 400 }));

      await expect(securityApi.resolveAlert('alert123')).rejects.toThrow('Failed to resolve alert');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to resolve alert:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
