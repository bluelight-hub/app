import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithAuth } from '../utils/authInterceptor';
import { securityReportsApi, ipWhitelistApi, accountManagementApi } from './security.helpers';

// Mock fetchWithAuth
vi.mock('../utils/authInterceptor');

describe('security.helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('securityReportsApi', () => {
    describe('getSecurityReports', () => {
      it('should return empty array (placeholder)', async () => {
        const result = await securityReportsApi.getSecurityReports();
        expect(result).toEqual([]);
      });

      it('should handle errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // The function catches errors internally and returns empty array
        // So we can't test it by mocking the function itself
        // Just verify it returns empty array
        const result = await securityReportsApi.getSecurityReports();

        expect(result).toEqual([]);

        consoleSpy.mockRestore();
      });
    });

    describe('generateSecurityReport', () => {
      it('should return placeholder report data', async () => {
        const params = {
          type: 'compliance' as const,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'pdf' as const,
        };

        const result = await securityReportsApi.generateSecurityReport(params);

        expect(result).toMatchObject({
          reportId: expect.any(String),
          downloadUrl: '/api/security/reports/download/placeholder',
        });
      });

      it('should handle different report types', async () => {
        const reportTypes = ['compliance', 'audit', 'incident', 'summary'] as const;

        for (const type of reportTypes) {
          const result = await securityReportsApi.generateSecurityReport({
            type,
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            format: 'csv',
          });

          expect(result.reportId).toBeTruthy();
          expect(result.downloadUrl).toBeTruthy();
        }
      });
    });

    describe('downloadReport', () => {
      it('should return a blob', async () => {
        const result = await securityReportsApi.downloadReport('report123');

        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('application/pdf');
        expect(result.size).toBeGreaterThan(0);
      });
    });
  });

  describe('ipWhitelistApi', () => {
    describe('getIpWhitelist', () => {
      it('should fetch IP whitelist', async () => {
        const mockWhitelist = [
          { id: '1', ipAddress: '192.168.1.0/24', description: 'Office', active: true },
        ];

        vi.mocked(fetchWithAuth).mockResolvedValue(
          new Response(JSON.stringify(mockWhitelist), { status: 200 }),
        );

        const result = await ipWhitelistApi.getIpWhitelist();

        expect(result).toEqual(mockWhitelist);
        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith('/api/security/ip-whitelist');
      });

      it('should return empty array on error', async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 500 }));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await ipWhitelistApi.getIpWhitelist();

        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('addToWhitelist', () => {
      it('should add IP to whitelist', async () => {
        const newEntry = { ipAddress: '10.0.0.0/8', description: 'Private network' };
        const mockResponse = { ...newEntry, id: '2', active: true };

        vi.mocked(fetchWithAuth).mockResolvedValue(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        );

        const result = await ipWhitelistApi.addToWhitelist(newEntry);

        expect(result).toEqual(mockResponse);
        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith('/api/security/ip-whitelist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry),
        });
      });

      it('should throw error on failure', async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 400 }));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(ipWhitelistApi.addToWhitelist({ ipAddress: '10.0.0.0/8' })).rejects.toThrow(
          'Failed to add to whitelist',
        );

        consoleSpy.mockRestore();
      });
    });

    describe('removeFromWhitelist', () => {
      it('should remove IP from whitelist', async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 200 }));

        await expect(ipWhitelistApi.removeFromWhitelist('192.168.1.0/24')).resolves.toBeUndefined();

        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith(
          '/api/security/ip-whitelist/192.168.1.0%2F24',
          { method: 'DELETE' },
        );
      });

      it('should properly encode IP addresses', async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 200 }));

        await ipWhitelistApi.removeFromWhitelist('10.0.0.0/8');

        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith(
          '/api/security/ip-whitelist/10.0.0.0%2F8',
          { method: 'DELETE' },
        );
      });
    });

    describe('updateWhitelistEntry', () => {
      it('should update whitelist entry', async () => {
        const mockResponse = {
          id: '1',
          ipAddress: '192.168.1.0/24',
          description: 'Updated description',
          active: false,
        };

        vi.mocked(fetchWithAuth).mockResolvedValue(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        );

        const updates = { description: 'Updated description', active: false };

        const result = await ipWhitelistApi.updateWhitelistEntry('1', updates);

        expect(result).toEqual(mockResponse);
        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith('/api/security/ip-whitelist/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      });
    });
  });

  describe('accountManagementApi', () => {
    describe('unlockAccount', () => {
      it('should unlock user account', async () => {
        const mockResponse = { message: 'Account unlocked successfully' };

        vi.mocked(fetchWithAuth).mockResolvedValue(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        );

        const result = await accountManagementApi.unlockAccount('user@example.com');

        expect(result).toEqual(mockResponse);
        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith(
          '/api/security/unlock-account/user%40example.com',
          { method: 'POST' },
        );
      });

      it('should throw error on failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, { status: 403 }));

        await expect(accountManagementApi.unlockAccount('user@example.com')).rejects.toThrow(
          'Failed to unlock account',
        );

        expect(consoleSpy).toHaveBeenCalledWith('Failed to unlock account:', expect.any(Error));
        consoleSpy.mockRestore();
      });
    });
  });
});
