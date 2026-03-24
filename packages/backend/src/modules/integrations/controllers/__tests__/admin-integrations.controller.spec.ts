// @ts-nocheck
import { InternalServerErrorException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { AdminIntegrationsController } from '../admin-integrations.controller';
import type { GetIntegrationOverviewHandler, IntegrationOverviewDto } from '@application/integrations/queries/get-integration-overview/get-integration-overview.handler';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { CircuitBreakerStateEnum } from '@infrastructure/resilience/circuit-breaker-state';

/**
 * Unit Tests fuer AdminIntegrationsController.
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (kein NestJS Test Module)
 * - Mocked Handler + Logger mit jest.fn()
 * - Focus: Controller-Orchestration, Query-Creation, Exception-Handling
 *
 * **Test Groups:**
 * 1. getOverview() Success Cases
 * 2. getOverview() Failure Cases (Handler Failure → 500)
 */
describe('AdminIntegrationsController', () => {
  let controller: AdminIntegrationsController;
  let mockOverviewHandler: jest.Mocked<Pick<GetIntegrationOverviewHandler, 'execute'>>;
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  // Standard-Admin-User fuer Mock
  const mockAdminUser: ValidatedUser = {
    userId: 'user_admin123',
    role: 'ADMIN',
  };

  // Standard-Erfolgsantwort fuer Mock
  const mockOverviewResponse: IntegrationOverviewDto = {
    integrations: [
      {
        serviceKey: 'hiorg-server',
        displayName: 'HiOrg-Server',
        status: 'verbunden',
        statusLabel: 'Verbunden',
        circuitBreakerState: CircuitBreakerStateEnum.CLOSED,
        failureCount: 0,
        errorRate: 0,
        lastSuccessAt: '2026-03-23T10:00:00.000Z',
        lastFailureAt: null,
        lastTestedAt: '2026-03-23T09:00:00.000Z',
        hasCredentials: true,
        isActive: true,
        suggestedAction: 'Verbindung testen',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOverviewHandler = {
      execute: jest.fn(),
    } as any;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Direct Instantiation Pattern
    controller = new AdminIntegrationsController(mockLogger as any, mockOverviewHandler as any);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. getOverview() - GET /admin/integrations/overview
  // ══════════════════════════════════════════════════════════════════════════════
  describe('getOverview()', () => {
    describe('Success Cases', () => {
      it('sollte Integrationsübersicht erfolgreich zurueckgeben (200)', async () => {
        // Given (Arrange)
        mockOverviewHandler.execute.mockResolvedValue(Result.ok(mockOverviewResponse));

        // When (Act)
        const result = await controller.getOverview(mockAdminUser);

        // Then (Assert)
        expect(result).toEqual({ integrations: mockOverviewResponse.integrations });
        expect(mockOverviewHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte Query korrekt erstellen und an Handler uebergeben', async () => {
        // Given (Arrange)
        mockOverviewHandler.execute.mockResolvedValue(Result.ok(mockOverviewResponse));

        // When (Act)
        await controller.getOverview(mockAdminUser);

        // Then (Assert)
        expect(mockOverviewHandler.execute).toHaveBeenCalledTimes(1);
        const executedQuery = mockOverviewHandler.execute.mock.calls[0]?.[0];
        expect(executedQuery).toBeDefined();
      });

      it('sollte Integrationen aus der Handler-Response korrekt mappen', async () => {
        // Given (Arrange)
        mockOverviewHandler.execute.mockResolvedValue(Result.ok(mockOverviewResponse));

        // When (Act)
        const result = await controller.getOverview(mockAdminUser);

        // Then (Assert)
        expect(result.integrations).toHaveLength(1);
        expect(result.integrations[0]?.serviceKey).toBe('hiorg-server');
        expect(result.integrations[0]?.status).toBe('verbunden');
        expect(result.integrations[0]?.displayName).toBe('HiOrg-Server');
      });

      it('sollte leeres Array zurueckgeben wenn keine Integrationen vorhanden', async () => {
        // Given (Arrange)
        const emptyResponse: IntegrationOverviewDto = { integrations: [] };
        mockOverviewHandler.execute.mockResolvedValue(Result.ok(emptyResponse));

        // When (Act)
        const result = await controller.getOverview(mockAdminUser);

        // Then (Assert)
        expect(result.integrations).toHaveLength(0);
      });

      it('sollte Audit-Log schreiben bei erfolgreichem Abruf', async () => {
        // Given (Arrange)
        mockOverviewHandler.execute.mockResolvedValue(Result.ok(mockOverviewResponse));

        // When (Act)
        await controller.getOverview(mockAdminUser);

        // Then (Assert)
        expect(mockLogger.log).toHaveBeenCalledTimes(1);
        const logMessage = mockLogger.log.mock.calls[0]?.[0] as string;
        expect(logMessage).toContain(mockAdminUser.userId);
        expect(logMessage).toContain('1 Integrationen');
      });
    });

    describe('Failure Cases', () => {
      it('sollte InternalServerErrorException werfen wenn Handler Failure zurueckgibt', async () => {
        // Given (Arrange)
        mockOverviewHandler.execute.mockResolvedValue(Result.fail('DB_CONNECTION_ERROR'));

        // When & Then (Act & Assert)
        await expect(controller.getOverview(mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException mit Status 500 werfen', async () => {
        // Given (Arrange)
        mockOverviewHandler.execute.mockResolvedValue(Result.fail('Unbekannter Fehler'));

        // When & Then (Act & Assert)
        await expect(controller.getOverview(mockAdminUser)).rejects.toMatchObject({
          response: expect.objectContaining({
            statusCode: 500,
            error: 'Internal Server Error',
          }),
        });
      });

      it('sollte Error loggen bei Handler Failure', async () => {
        // Given (Arrange)
        mockOverviewHandler.execute.mockResolvedValue(Result.fail('Test Error Message'));

        // When (Act)
        try {
          await controller.getOverview(mockAdminUser);
        } catch {
          // Expected
        }

        // Then (Assert)
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        const errorMessage = mockLogger.error.mock.calls[0]?.[0] as string;
        expect(errorMessage).toContain('Test Error Message');
      });

      it('sollte mit SUPER_ADMIN Rolle genauso funktionieren', async () => {
        // Given (Arrange)
        const superAdmin: ValidatedUser = {
          userId: 'user_superadmin1',
          role: 'SUPER_ADMIN',
        };
        mockOverviewHandler.execute.mockResolvedValue(Result.ok(mockOverviewResponse));

        // When (Act)
        const result = await controller.getOverview(superAdmin);

        // Then (Assert)
        expect(result.integrations).toHaveLength(1);
        expect(mockLogger.log).toHaveBeenCalled();
        const logMessage = mockLogger.log.mock.calls[0]?.[0] as string;
        expect(logMessage).toContain(superAdmin.userId);
      });
    });
  });
});
