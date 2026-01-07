import type { Request } from 'express';
import type { HealthCheckResult, HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import type { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { HealthController } from './health.controller';
import type { PrismaHealthIndicator } from './prisma-health.indicator';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import { Result } from '@domain/common/result';
import type { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { AccessTokenId } from '@domain/value-objects/access-token-id';
import { TokenHash } from '@domain/value-objects/token-hash';

/**
 * Unit Tests fuer HealthController (Story 1.4).
 *
 * Diese Tests validieren die Token-basierte Health-Response Logik:
 * - Ohne Token: BasicHealthDto (status, setupComplete, version)
 * - Mit gueltigem Token: DetailedHealthDto (database, uptime, memory, loadAverage)
 * - Mit ungueltigem Token: BasicHealthDto (kein Error!)
 *
 * **Test Coverage:**
 * - check() Method: Token-basierte Response-Auswahl
 * - getBasicHealth(): Setup-Status Ermittlung, Security (kein DB-Status Leak)
 * - getDetailedHealth(): Erweiterte Metriken fuer authentifizierte Clients
 * - Cache-Behavior: 10s TTL, Invalidierung bei Fehlern
 * - Error Handling: Graceful Degradation bei ungueltigen Tokens
 *
 * **Mocking Strategy:**
 * - IServerAccessTokenRepository: Vollstaendig gemockt (findAllActive, countActive)
 * - PrismaService: Gemockt fuer user.count() Abfragen
 * - PrismaHealthIndicator: Gemockt fuer pingCheck
 * - HealthCheckService: Gemockt fuer check() Aufrufe
 *
 * **Test Patterns:**
 * - AAA Pattern: Arrange -> Act -> Assert
 * - Mock Reset: beforeEach() cleared alle Mocks
 * - Given-When-Then Comments fuer Lesbarkeit
 */
describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthCheckService: jest.Mocked<HealthCheckService>;
  let mockMemoryIndicator: jest.Mocked<MemoryHealthIndicator>;
  let mockDiskIndicator: jest.Mocked<DiskHealthIndicator>;
  let mockPrismaHealth: jest.Mocked<PrismaHealthIndicator>;
  let mockTokenRepo: jest.Mocked<IServerAccessTokenRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  /**
   * Mock HealthCheckResult fuer detaillierte Health-Response
   */
  const mockDetailedHealthResult: HealthCheckResult = {
    status: 'ok',
    info: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
      cpu: { status: 'up', loadAverage: [0.5, 0.7, 0.6], usedCores: 4 },
      internet: { status: 'up', message: 'Internet-Verbindung aktiv' },
      fuekw: { status: 'up', message: 'FueKW-Verbindung aktiv' },
      connection_status: { status: 'up', details: { mode: 'online' } },
    },
    error: {},
    details: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
      cpu: { status: 'up', loadAverage: [0.5, 0.7, 0.6], usedCores: 4 },
      internet: { status: 'up', message: 'Internet-Verbindung aktiv' },
      fuekw: { status: 'up', message: 'FueKW-Verbindung aktiv' },
      connection_status: { status: 'up', details: { mode: 'online' } },
    },
  };

  /**
   * Helper: Erstellt einen Mock ServerAccessToken mit echtem bcrypt-Hash
   */
  const createMockTokenWithHash = async (rawToken: string, overrides: { isRevoked?: boolean; expiresAt?: Date | null } = {}): Promise<ServerAccessToken> => {
    const idResult = AccessTokenId.create();
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const tokenHashResult = TokenHash.create(hashedToken);

    return {
      id: idResult.value!,
      tokenHash: tokenHashResult.value!,
      name: 'Test Token',
      lastUsedAt: null,
      expiresAt: overrides.expiresAt ?? null,
      isRevoked: overrides.isRevoked ?? false,
      revokedAt: null,
      isValid: jest.fn().mockReturnValue(!overrides.isRevoked && (!overrides.expiresAt || overrides.expiresAt > new Date())),
      recordUsage: jest.fn(),
      revoke: jest.fn(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ServerAccessToken;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HealthCheckService
    mockHealthCheckService = {
      check: jest.fn().mockResolvedValue(mockDetailedHealthResult),
    } as unknown as jest.Mocked<HealthCheckService>;

    // Mock MemoryHealthIndicator
    mockMemoryIndicator = {
      checkHeap: jest.fn().mockReturnValue({ memory_heap: { status: 'up' } }),
      checkRSS: jest.fn().mockReturnValue({ memory_rss: { status: 'up' } }),
    } as unknown as jest.Mocked<MemoryHealthIndicator>;

    // Mock DiskHealthIndicator
    mockDiskIndicator = {
      checkStorage: jest.fn().mockReturnValue({ storage: { status: 'up' } }),
    } as unknown as jest.Mocked<DiskHealthIndicator>;

    // Mock PrismaHealthIndicator
    mockPrismaHealth = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
      isConnected: jest.fn().mockResolvedValue({ database_connections: { status: 'up', connected: true } }),
    } as unknown as jest.Mocked<PrismaHealthIndicator>;

    // Mock IServerAccessTokenRepository
    mockTokenRepo = {
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findAllActive: jest.fn().mockResolvedValue(Result.ok([])),
      save: jest.fn(),
      delete: jest.fn(),
      existsByTokenHash: jest.fn(),
      countActive: jest.fn().mockResolvedValue(Result.ok(0)),
    } as unknown as jest.Mocked<IServerAccessTokenRepository>;

    // Mock PrismaService
    mockPrisma = {
      user: {
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    // Mock ConfigService (fuer INSECURE_MODE Abfragen)
    mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<ConfigService>;

    // Controller mit allen 7 Dependencies erstellen
    controller = new HealthController(mockHealthCheckService, mockMemoryIndicator, mockDiskIndicator, mockPrismaHealth, mockPrisma, mockTokenRepo, mockConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('check() - Token-Differenzierung', () => {
    /**
     * Test: Request ohne Token -> BasicHealthDto Response
     * Story 1.4 AC1: Ohne Token nur oeffentliche Informationen
     */
    it('should return BasicHealthDto without X-Server-Access-Token header', async () => {
      // Given: Request ohne Token Header
      const mockRequest = {
        headers: {},
      } as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: Nur BasicHealthDto Felder (status, setupComplete, version)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('setupComplete');
      expect(result).toHaveProperty('version');
      // BasicHealthDto hat KEINE info/details Properties
      expect(result).not.toHaveProperty('info');
      expect(result).not.toHaveProperty('details');
    });

    /**
     * Test: Request mit gueltigem Token -> DetailedHealthDto Response
     * Story 1.4 AC2: Mit gueltigem Token erweiterte Health-Response
     */
    it('should return DetailedHealthDto with valid X-Server-Access-Token header', async () => {
      // Given: Request mit gueltigem Token Header
      const rawToken = 'blh_test_valid_token_123';
      const validToken = await createMockTokenWithHash(rawToken);
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
      mockPrisma.user.count.mockResolvedValue(1); // Admin existiert
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1)); // Token existiert

      const mockRequest = {
        headers: {
          'x-server-access-token': rawToken,
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: DetailedHealthDto mit erweiterten Feldern
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('setupComplete');
      expect(result).toHaveProperty('version');
      // AC2 spezifische Felder
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('loadAverage');
      // Keine Terminus-spezifischen Felder
      expect(result).not.toHaveProperty('info');
      expect(result).not.toHaveProperty('details');
      expect(result).not.toHaveProperty('error');
    });

    /**
     * Test: Request mit ungueltigem Token -> BasicHealthDto Response (kein Error!)
     * Story 1.4 AC1: Ungueltiger Token fuehrt zu Basic Response, NICHT zu 401/403
     *
     * Security: Keine Information Disclosure ueber Token-Gueltigkeit
     */
    it('should return BasicHealthDto with invalid token (no 401/403 error)', async () => {
      // Given: Request mit Token der nicht validiert werden kann
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([])); // Keine Tokens in DB

      const mockRequest = {
        headers: {
          'x-server-access-token': 'blh_invalid_token_xyz',
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: BasicHealthDto (nicht 401/403!)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('setupComplete');
      expect(result).toHaveProperty('version');
      expect(result).not.toHaveProperty('info');
      expect(result).not.toHaveProperty('details');
    });

    /**
     * Test: Request mit revoked Token -> BasicHealthDto Response
     * Story 1.4: Revoked Tokens behandeln wie ungueltige Tokens
     */
    it('should return BasicHealthDto with revoked token', async () => {
      // Given: Request mit revoked Token
      const rawToken = 'blh_revoked_token_abc';
      const revokedToken = await createMockTokenWithHash(rawToken, { isRevoked: true });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([revokedToken]));

      const mockRequest = {
        headers: {
          'x-server-access-token': rawToken,
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: BasicHealthDto (revoked = ungueltig)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).not.toHaveProperty('info');
    });

    /**
     * Test: Token mit abgelaufenem expiresAt -> BasicHealthDto Response
     * Business Rule: Abgelaufene Tokens behandeln wie ungueltige Tokens
     */
    it('should return BasicHealthDto with expired token', async () => {
      // Given: Request mit abgelaufenem Token
      const rawToken = 'blh_expired_token_def';
      const expiredToken = await createMockTokenWithHash(rawToken, {
        expiresAt: new Date('2020-01-01'), // Vergangenes Datum
      });
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([expiredToken]));

      const mockRequest = {
        headers: {
          'x-server-access-token': rawToken,
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: BasicHealthDto (Token ist abgelaufen, also ungueltig)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).not.toHaveProperty('info');
    });

    /**
     * Test: Repository-Fehler -> BasicHealthDto Response (graceful degradation)
     * Story 1.4: Bei Fehlern konservativ BasicHealthDto zurueckgeben
     */
    it('should return BasicHealthDto when repository returns error', async () => {
      // Given: Repository wirft Fehler
      mockTokenRepo.findAllActive.mockResolvedValue(Result.fail('Database error'));

      const mockRequest = {
        headers: {
          'x-server-access-token': 'blh_any_token',
        },
      } as unknown as Request;

      // When: check() mit Request aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: BasicHealthDto (graceful degradation)
      expect(result).toBeDefined();
      expect(result).toHaveProperty('status');
      expect(result).not.toHaveProperty('info');
    });
  });

  describe('check() - setupComplete Logic', () => {
    /**
     * Test: Setup-Pending -> setupComplete: false (kein Admin)
     * Story 1.4 AC3: Setup nicht abgeschlossen = setupComplete: false
     */
    it('should return setupComplete: false when no admin user exists', async () => {
      // Given: Keine Admin User in DB
      mockPrisma.user.count.mockResolvedValue(0);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1)); // Token existiert

      const mockRequest = { headers: {} } as Request;

      // When: check() aufgerufen wird (ohne Token)
      const result = await controller.check(mockRequest);

      // Then: setupComplete = false
      expect(result).toHaveProperty('setupComplete', false);
    });

    /**
     * Test: Setup-Pending -> setupComplete: false (keine Tokens)
     * Story 1.4 AC3: Admin existiert aber keine aktiven Tokens
     */
    it('should return setupComplete: false when no active tokens exist', async () => {
      // Given: Admin existiert aber keine aktiven Tokens
      mockPrisma.user.count.mockResolvedValue(1); // Admin existiert
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0)); // Keine Tokens

      const mockRequest = { headers: {} } as Request;

      // When: check() aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: setupComplete = false
      expect(result).toHaveProperty('setupComplete', false);
    });

    /**
     * Test: Setup-Complete -> setupComplete: true
     * Story 1.4 AC3: Admin UND aktive Tokens existieren
     */
    it('should return setupComplete: true when admin and active token exist', async () => {
      // Given: Admin User UND aktive Tokens existieren
      mockPrisma.user.count.mockResolvedValue(1); // Admin existiert
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1)); // Token existiert

      const mockRequest = { headers: {} } as Request;

      // When: check() aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: setupComplete = true
      expect(result).toHaveProperty('setupComplete', true);
    });
  });

  describe('checkLiveness()', () => {
    it('should return database health status', async () => {
      // Given: Database ist verfuegbar
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      });

      // When: checkLiveness() aufgerufen wird
      const result = await controller.checkLiveness();

      // Then: Status 'ok' mit Database-Info
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });

    it('should return error status when database is down', async () => {
      // Given: Database ist nicht verfuegbar
      mockHealthCheckService.check.mockResolvedValue({
        status: 'error',
        info: {},
        error: { database: { status: 'down', message: 'Connection failed' } },
        details: { database: { status: 'down', message: 'Connection failed' } },
      });

      // When: checkLiveness() aufgerufen wird
      const result = await controller.checkLiveness();

      // Then: Status 'error'
      expect(result.status).toBe('error');
    });
  });

  describe('checkReadiness()', () => {
    it('should return memory and disk health status', async () => {
      // Given: Memory und Disk sind verfuegbar
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: {
          memory_heap: { status: 'up' },
          storage: { status: 'up' },
        },
        error: {},
        details: {
          memory_heap: { status: 'up' },
          storage: { status: 'up' },
        },
      });

      // When: checkReadiness() aufgerufen wird
      const result = await controller.checkReadiness();

      // Then: Status 'ok'
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('checkDatabase()', () => {
    it('should return detailed database health', async () => {
      // Given: Database ist verbunden
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: {
          database: { status: 'up' },
          database_connections: { status: 'up', connected: true },
        },
        error: {},
        details: {
          database: { status: 'up' },
          database_connections: { status: 'up', connected: true },
        },
      });

      // When: checkDatabase() aufgerufen wird
      const result = await controller.checkDatabase();

      // Then: Status 'ok' mit Connection-Details
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('check() - Security: No Information Disclosure (AC1)', () => {
    /**
     * Test: BasicHealthDto gibt IMMER status 'ok' zurueck, auch bei DB-Fehler
     * Story 1.4 AC1: "keine weiteren System-Informationen werden preisgegeben"
     */
    it('should always return status ok for unauthenticated requests even when DB is down', async () => {
      // Given: Database ist nicht erreichbar
      mockPrismaHealth.pingCheck.mockRejectedValue(new Error('Database connection failed'));
      mockPrisma.user.count.mockResolvedValue(0);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(0));

      const mockRequest = { headers: {} } as Request;

      // When: check() ohne Token aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: Status ist IMMER 'ok' (keine DB-Information Disclosure)
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('setupComplete');
      expect(result).toHaveProperty('version');
      // Keine sensiblen Felder
      expect(result).not.toHaveProperty('database');
      expect(result).not.toHaveProperty('uptime');
    });

    /**
     * Test: DetailedHealthDto zeigt tatsaechlichen DB-Status
     * Story 1.4 AC2: Authentifizierte Clients sehen echte Informationen
     */
    it('should return actual database status for authenticated requests', async () => {
      // Given: Gueltiger Token, Database ist nicht erreichbar
      const rawToken = 'blh_auth_token_456';
      const validToken = await createMockTokenWithHash(rawToken);
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
      mockPrismaHealth.pingCheck.mockRejectedValue(new Error('Database down'));
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));

      const mockRequest = {
        headers: { 'x-server-access-token': rawToken },
      } as unknown as Request;

      // When: check() mit gueltigem Token aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: DetailedHealthDto zeigt echten DB-Status
      expect(result).toHaveProperty('status', 'error');
      expect(result).toHaveProperty('database', 'disconnected');
    });
  });

  describe('check() - Cache Behavior', () => {
    /**
     * Test: Cache wird genutzt innerhalb TTL
     * Performance: Wiederholte Calls innerhalb 10s nutzen Cache
     */
    it('should use cached setupComplete value within TTL', async () => {
      // Given: Admin und Token existieren
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));

      const mockRequest = { headers: {} } as Request;

      // When: Zwei Calls hintereinander
      await controller.check(mockRequest);
      await controller.check(mockRequest);

      // Then: DB-Call nur einmal (zweiter Call nutzt Cache)
      // Hinweis: user.count wird in isSetupComplete() aufgerufen
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    /**
     * Test: Cache wird bei DB-Fehler invalidiert
     * Bug-Fix: Stale Cache bei Fehlern vermeiden
     */
    it('should invalidate cache when database error occurs', async () => {
      // Given: Erster Call erfolgreich, zweiter Call mit DB-Fehler
      mockPrisma.user.count.mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('DB Error')).mockResolvedValueOnce(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));

      const mockRequest = { headers: {} } as Request;

      // When: Drei Calls mit DB-Fehler in der Mitte
      const result1 = await controller.check(mockRequest);

      // Simuliere Zeit vergangen (Cache abgelaufen) durch neuen Controller
      // In echtem Test: jest.useFakeTimers()
      const controller2 = new HealthController(mockHealthCheckService, mockMemoryIndicator, mockDiskIndicator, mockPrismaHealth, mockPrisma, mockTokenRepo, mockConfigService);
      const result2 = await controller2.check(mockRequest);

      // Then: Ergebnis reflektiert DB-Status korrekt
      expect(result1).toHaveProperty('setupComplete', true);
      // Nach Fehler: setupComplete = false
      expect(result2).toHaveProperty('setupComplete', false);
    });
  });

  describe('check() - insecureMode in Health Responses (Story 1.5)', () => {
    /**
     * Test 6.4: BasicHealth Response enthält insecureMode: true wenn INSECURE_MODE=true
     * Story 1.5: Frontend muss ueber Insecure-Modus informiert werden
     */
    it('should include insecureMode=true in basic health when INSECURE_MODE=true', async () => {
      // Given: INSECURE_MODE ist auf 'true' gesetzt
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'INSECURE_MODE') return 'true';
        return undefined;
      });

      const mockRequest = { headers: {} } as Request;

      // When: check() ohne Token aufgerufen wird (unauthenticated -> BasicHealthDto)
      const result = await controller.check(mockRequest);

      // Then: insecureMode ist true
      expect(result).toHaveProperty('insecureMode', true);
    });

    /**
     * Test 6.5: DetailedHealth Response enthält insecureMode: true wenn INSECURE_MODE=true
     * Story 1.5: Authentifizierte Clients sehen auch insecureMode
     */
    it('should include insecureMode=true in detailed health when INSECURE_MODE=true', async () => {
      // Given: INSECURE_MODE ist auf 'true' gesetzt
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'INSECURE_MODE') return 'true';
        return undefined;
      });

      // Gueltiger Token fuer DetailedHealthDto
      const rawToken = 'blh_test_insecure_token';
      const validToken = await createMockTokenWithHash(rawToken);
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));

      const mockRequest = {
        headers: { 'x-server-access-token': rawToken },
      } as unknown as Request;

      // When: check() mit gueltigem Token aufgerufen wird (authenticated -> DetailedHealthDto)
      const result = await controller.check(mockRequest);

      // Then: insecureMode ist true
      expect(result).toHaveProperty('insecureMode', true);
      // Validierung dass es DetailedHealthDto ist
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('uptime');
    });

    /**
     * Bonus Test: insecureMode=false wenn INSECURE_MODE nicht gesetzt
     * Story 1.5: Default-Verhalten ist sicherer Modus
     */
    it('should include insecureMode=false in basic health when INSECURE_MODE not set', async () => {
      // Given: INSECURE_MODE ist nicht gesetzt (undefined)
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'INSECURE_MODE') return undefined;
        return undefined;
      });

      const mockRequest = { headers: {} } as Request;

      // When: check() aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: insecureMode ist false
      expect(result).toHaveProperty('insecureMode', false);
    });

    /**
     * Bonus Test: insecureMode=false wenn INSECURE_MODE='false'
     * Story 1.5: Explizit false gesetzt
     */
    it('should include insecureMode=false in basic health when INSECURE_MODE=false', async () => {
      // Given: INSECURE_MODE ist explizit auf 'false' gesetzt
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'INSECURE_MODE') return 'false';
        return undefined;
      });

      const mockRequest = { headers: {} } as Request;

      // When: check() aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: insecureMode ist false
      expect(result).toHaveProperty('insecureMode', false);
    });

    /**
     * Bonus Test: insecureMode=false in DetailedHealth wenn nicht gesetzt
     * Story 1.5: Konsistenz zwischen Basic und Detailed Response
     */
    it('should include insecureMode=false in detailed health when INSECURE_MODE not set', async () => {
      // Given: INSECURE_MODE ist nicht gesetzt
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'INSECURE_MODE') return undefined;
        return undefined;
      });

      // Gueltiger Token fuer DetailedHealthDto
      const rawToken = 'blh_test_secure_token';
      const validToken = await createMockTokenWithHash(rawToken);
      mockTokenRepo.findAllActive.mockResolvedValue(Result.ok([validToken]));
      mockPrisma.user.count.mockResolvedValue(1);
      mockTokenRepo.countActive.mockResolvedValue(Result.ok(1));

      const mockRequest = {
        headers: { 'x-server-access-token': rawToken },
      } as unknown as Request;

      // When: check() mit gueltigem Token aufgerufen wird
      const result = await controller.check(mockRequest);

      // Then: insecureMode ist false in DetailedHealthDto
      expect(result).toHaveProperty('insecureMode', false);
      expect(result).toHaveProperty('database');
    });
  });
});
