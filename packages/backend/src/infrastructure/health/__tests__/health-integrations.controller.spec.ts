import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';
import { CircuitBreakerStateEnum } from '@infrastructure/resilience/circuit-breaker-state';
import { HealthController } from '../health.controller';
import type { HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import type { ConfigService } from '@nestjs/config';
import type { PrismaHealthIndicator } from '../prisma-health.indicator';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { IServerConfigRepository } from '@domain/repositories/i-server-config.repository';
import { Result } from '@domain/common/result';
import * as bcrypt from 'bcrypt';

/**
 * Unit Tests fuer HealthController - Integration Health Endpoint (Story 5.3 AC4).
 *
 * Testet den GET /health/integrations Endpoint, der den Circuit Breaker
 * Status aller registrierten externen Integrationen zurueckgibt.
 */
describe('HealthController - getIntegrationHealth() (AC4)', () => {
  let controller: HealthController;
  let mockCircuitBreaker: jest.Mocked<CircuitBreakerService>;
  let mockTokenRepo: any;

  /** Erstellt ein Mock-Request Objekt mit optionalem Token */
  const createMockRequest = (token?: string) =>
    ({
      headers: token ? { 'x-server-access-token': token } : {},
    }) as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCircuitBreaker = {
      register: jest.fn(),
      execute: jest.fn(),
      getState: jest.fn().mockReturnValue(CircuitBreakerStateEnum.CLOSED),
      getAllStatus: jest.fn().mockReturnValue([]),
      reset: jest.fn(),
      onStateChange: jest.fn(),
      isOpen: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<CircuitBreakerService>;

    // Token-Hash fuer 'valid-token'
    const tokenHash = await bcrypt.hash('valid-token', 10);

    // Minimale Mocks fuer die anderen Dependencies
    const mockHealthCheckService = { check: jest.fn() } as unknown as HealthCheckService;
    const mockMemory = { checkHeap: jest.fn() } as unknown as MemoryHealthIndicator;
    const mockDisk = { checkStorage: jest.fn() } as unknown as DiskHealthIndicator;
    const mockPrismaHealth = { pingCheck: jest.fn() } as unknown as PrismaHealthIndicator;
    const mockPrisma = { user: { count: jest.fn() } } as unknown as PrismaService;
    mockTokenRepo = {
      findAllActive: jest.fn().mockResolvedValue(
        Result.ok([
          {
            tokenHash: { value: tokenHash },
            isValid: () => true,
          },
        ]),
      ),
      countActive: jest.fn().mockResolvedValue(Result.ok(1)),
    } as unknown as IServerAccessTokenRepository;
    const mockConfigRepo = {
      isInsecureMode: jest.fn().mockResolvedValue(Result.ok(false)),
    } as unknown as IServerConfigRepository;
    const mockConfigService = { get: jest.fn() } as unknown as ConfigService;

    const mockSystemHealthHandler = {
      execute: jest.fn().mockResolvedValue({
        isSuccess: true,
        value: {
          zustellrate: 100,
          websocketConnections: 0,
          outboxQueueDepth: 0,
          apiResponseTime: { p50: 0, p95: 0, p99: 0 },
          circuitBreakerStatus: {},
          dbConnectionPoolUsage: 0,
          uptime: 3600,
          timestamp: new Date(),
        },
      }),
    } as any;

    controller = new HealthController(
      mockHealthCheckService,
      mockMemory,
      mockDisk,
      mockPrismaHealth,
      mockPrisma,
      mockTokenRepo,
      mockConfigRepo,
      mockConfigService,
      mockCircuitBreaker,
      mockSystemHealthHandler,
    );
  });

  it('should return empty integrations when no token is provided', async () => {
    const request = createMockRequest();
    const result = await controller.getIntegrationHealth(request);
    expect(result).toEqual({ integrations: [] });
    expect(mockCircuitBreaker.getAllStatus).not.toHaveBeenCalled();
  });

  it('should return empty integrations when invalid token is provided', async () => {
    const request = createMockRequest('invalid-token');
    const result = await controller.getIntegrationHealth(request);
    expect(result).toEqual({ integrations: [] });
    expect(mockCircuitBreaker.getAllStatus).not.toHaveBeenCalled();
  });

  it('should return status with valid token', async () => {
    mockCircuitBreaker.getAllStatus.mockReturnValue([
      {
        serviceName: 'hiorg-server',
        state: CircuitBreakerStateEnum.CLOSED,
        failureCount: 0,
        successCount: 10,
        lastFailure: null,
        lastSuccess: '2026-02-23T10:00:00.000Z',
      },
      {
        serviceName: 'etb',
        state: CircuitBreakerStateEnum.OPEN,
        failureCount: 5,
        successCount: 15,
        lastFailure: '2026-02-23T10:05:00.000Z',
        lastSuccess: '2026-02-23T09:00:00.000Z',
      },
    ]);

    const request = createMockRequest('valid-token');
    const result = await controller.getIntegrationHealth(request);

    expect(result.integrations).toHaveLength(2);
    expect(result.integrations[0]).toEqual({
      serviceName: 'hiorg-server',
      state: CircuitBreakerStateEnum.CLOSED,
      failureCount: 0,
      lastFailure: null,
      lastSuccess: '2026-02-23T10:00:00.000Z',
      lastSuccessAt: '2026-02-23T10:00:00.000Z',
      lastFailureAt: null,
      errorRate: 0,
      responseTimeP95: undefined,
    });
    expect(result.integrations[1]).toEqual({
      serviceName: 'etb',
      state: CircuitBreakerStateEnum.OPEN,
      failureCount: 5,
      lastFailure: '2026-02-23T10:05:00.000Z',
      lastSuccess: '2026-02-23T09:00:00.000Z',
      lastSuccessAt: '2026-02-23T09:00:00.000Z',
      lastFailureAt: '2026-02-23T10:05:00.000Z',
      errorRate: 25,
      responseTimeP95: undefined,
    });
  });

  it('should correctly map all CircuitStatus fields to IntegrationStatusDto', async () => {
    mockCircuitBreaker.getAllStatus.mockReturnValue([
      {
        serviceName: 'hiorg-server',
        state: CircuitBreakerStateEnum.HALF_OPEN,
        failureCount: 3,
        successCount: 7,
        lastFailure: '2026-02-23T10:05:00.000Z',
        lastSuccess: '2026-02-23T10:00:00.000Z',
      },
    ]);

    const request = createMockRequest('valid-token');
    const result = await controller.getIntegrationHealth(request);

    const integration = result.integrations[0];
    expect(integration.serviceName).toBe('hiorg-server');
    expect(integration.state).toBe(CircuitBreakerStateEnum.HALF_OPEN);
    expect(integration.failureCount).toBe(3);
    expect(integration.lastFailure).toBe('2026-02-23T10:05:00.000Z');
    expect(integration.lastSuccess).toBe('2026-02-23T10:00:00.000Z');
    expect(integration.errorRate).toBe(30);
    expect(integration.responseTimeP95).toBeUndefined();
  });

  it('should return empty integrations when no circuit breakers registered (with valid token)', async () => {
    mockCircuitBreaker.getAllStatus.mockReturnValue([]);
    const request = createMockRequest('valid-token');
    const result = await controller.getIntegrationHealth(request);

    expect(result).toEqual({ integrations: [] });
    expect(mockCircuitBreaker.getAllStatus).toHaveBeenCalledTimes(1);
  });
});
