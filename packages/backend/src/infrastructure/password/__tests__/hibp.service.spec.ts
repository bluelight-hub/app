import { Test, type TestingModule } from '@nestjs/testing';
import { HibpService } from '../hibp.service';
import { LOGGER } from '@/infrastructure/di-tokens';

/**
 * Unit Tests für HibpService
 *
 * Testet K-Anonymity Model und Error Handling.
 * HIBP API wird gemocked für deterministische Tests.
 */
describe('HibpService', () => {
  let service: HibpService;
  let mockFetch: jest.SpyInstance;

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HibpService, { provide: LOGGER, useValue: mockLogger }],
    }).compile();

    service = module.get<HibpService>(HibpService);

    // Global fetch mocken
    mockFetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('checkPassword', () => {
    it('should return isCompromised=true when password hash is found in HIBP response', async () => {
      // Given: Ein bekanntes kompromittiertes Passwort ("password")
      // SHA-1 von "password" = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
      // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
      const compromisedPassword = 'password';

      // Mock HIBP API Response mit dem Hash-Suffix
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `
1E4C9B93F3F0682250B6CF8331B7EE68FD8:3730471
1E4C9B3ED3C74C2B7F5A5C8C7D6E8F9A0B1C2D3:100
1E4C9B93F3F0682250B6CF8331B7EE68FD9:50
        `.trim(),
      } as Response);

      // When
      const result = await service.checkPassword(compromisedPassword);

      // Then
      expect(result.isCompromised).toBe(true);
      expect(result.occurrences).toBe(3730471);
      expect(result.error).toBeUndefined();
    });

    it('should return isCompromised=false when password hash is not found', async () => {
      // Given: Ein sicheres, einzigartiges Passwort
      const safePassword = 'MyVeryUniqueSecurePassword2025!@#$%';

      // Mock HIBP API Response ohne unser Hash
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `
0123456789ABCDEF0123456789ABCDEF012:100
FEDCBA9876543210FEDCBA9876543210FED:50
        `.trim(),
      } as Response);

      // When
      const result = await service.checkPassword(safePassword);

      // Then
      expect(result.isCompromised).toBe(false);
      expect(result.occurrences).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle HIBP API error gracefully (not block)', async () => {
      // Given: API-Fehler (z.B. Rate Limiting)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      } as Response);

      // When
      const result = await service.checkPassword('anypassword');

      // Then: Graceful degradation - nicht blockieren
      expect(result.isCompromised).toBe(false);
      expect(result.occurrences).toBe(0);
      expect(result.error).toContain('HIBP API error');
    });

    it('should handle network timeout gracefully', async () => {
      // Given: Netzwerk-Timeout
      mockFetch.mockRejectedValueOnce(new Error('AbortError: Timeout'));

      // When
      const result = await service.checkPassword('anypassword');

      // Then: Graceful degradation
      expect(result.isCompromised).toBe(false);
      expect(result.occurrences).toBe(0);
      expect(result.error).toContain('Timeout');
    });

    it('should handle network error gracefully', async () => {
      // Given: Netzwerk-Fehler
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // When
      const result = await service.checkPassword('anypassword');

      // Then: Graceful degradation
      expect(result.isCompromised).toBe(false);
      expect(result.occurrences).toBe(0);
      expect(result.error).toContain('Network error');
    });

    it('should use K-Anonymity (only send first 5 chars of hash)', async () => {
      // Given
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      } as Response);

      // When
      await service.checkPassword('testpassword');

      // Then: Verify API was called with 5-char prefix
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toMatch(/https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/);
    });

    it('should be case-insensitive for hash matching', async () => {
      // Given: HIBP response with lowercase suffix (should still match)
      const password = 'password';
      // SHA-1 Suffix should match regardless of case

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `
1e4c9b93f3f0682250b6cf8331b7ee68fd8:1000
        `.trim(),
      } as Response);

      // When
      const result = await service.checkPassword(password);

      // Then: Should match despite lowercase response
      expect(result.isCompromised).toBe(true);
    });
  });
});
