// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { INTEGRATIONS, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerStateEnum } from '@infrastructure/resilience/circuit-breaker-state';
import type { CircuitStatus } from '@infrastructure/resilience/circuit-breaker.service';
import type { IIntegrationCredentialRepository } from '@domain/integrations/repositories/i-integration-credential.repository';
import type { IntegrationCredential } from '@domain/integrations/entities/integration-credential.entity';
import { GetIntegrationOverviewHandler } from '../get-integration-overview.handler';
import { GetIntegrationOverviewQuery } from '../get-integration-overview.query';

/**
 * Unit Tests fuer GetIntegrationOverviewHandler.
 *
 * **Test Strategy:**
 * - AAA Pattern mit Given-When-Then Kommentaren
 * - @Injectable() Handler getestet via Constructor Injection mit Mocks
 * - jest.Mocked<Pick<...>> fuer typisierte Mocks (H8 aus Story 5.2)
 * - Result Pattern Return Values
 *
 * **Test Groups:**
 * 1. Status-Mappings (CB CLOSED/OPEN/HALF_OPEN)
 * 2. Token-Ablauf ueberschreibt CB Status
 * 3. Deaktivierte Integration
 * 4. Keine Credentials (nicht_konfiguriert)
 * 5. suggestedAction korrekt pro Status
 * 6. Error Rate Calculation
 * 7. Timestamps (lastSuccessAt/lastFailureAt/lastTestedAt)
 * 8. Error Handling
 */
describe('GetIntegrationOverviewHandler', () => {
  let handler: GetIntegrationOverviewHandler;
  let mockCredentialRepo: jest.Mocked<Pick<IIntegrationCredentialRepository, 'findByType'>>;
  let mockCircuitBreaker: jest.Mocked<Pick<{ getAllStatus: () => CircuitStatus[] }, 'getAllStatus'>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockCredentialRepo = {
      findByType: jest.fn(),
    };

    mockCircuitBreaker = {
      getAllStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetIntegrationOverviewHandler, { provide: INTEGRATIONS.CREDENTIAL_REPOSITORY, useValue: mockCredentialRepo }, { provide: RESILIENCE.CIRCUIT_BREAKER, useValue: mockCircuitBreaker }],
    }).compile();

    handler = module.get<GetIntegrationOverviewHandler>(GetIntegrationOverviewHandler);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Erstellt eine gueltige GetIntegrationOverviewQuery.
   */
  function createQuery(): GetIntegrationOverviewQuery {
    const result = GetIntegrationOverviewQuery.create();
    if (result.isFailure) {
      throw new Error(result.error ?? 'Failed to create GetIntegrationOverviewQuery');
    }
    return result.value as GetIntegrationOverviewQuery;
  }

  /**
   * Erstellt ein Mock IntegrationCredential mit konfigurierbaren Properties.
   */
  function createMockCredential(
    overrides: Partial<{
      isActive: boolean;
      isAccessTokenExpired: boolean;
      lastTestedAt: Date | undefined;
      hasOAuthTokens: boolean;
    }> = {},
  ): IntegrationCredential {
    return {
      isActive: overrides.isActive ?? true,
      isAccessTokenExpired: overrides.isAccessTokenExpired ?? false,
      lastTestedAt: overrides.lastTestedAt ?? undefined,
      hasOAuthTokens: overrides.hasOAuthTokens ?? true,
    } as unknown as IntegrationCredential;
  }

  /**
   * Erstellt einen Mock CircuitStatus fuer hiorg-server.
   */
  function createMockCbStatus(overrides: Partial<CircuitStatus> = {}): CircuitStatus {
    return {
      serviceName: 'hiorg-server',
      state: CircuitBreakerStateEnum.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailure: null,
      lastSuccess: null,
      ...overrides,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. Status-Mappings: CB State -> Aggregierter Status
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Status-Mappings (CB State -> aggregierter Status)', () => {
    it('sollte CB CLOSED auf "verbunden" mappen', async () => {
      // Given (Arrange): Aktive Credential mit gueltigem Token, CB CLOSED
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.CLOSED })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.integrations[0]?.status).toBe('verbunden');
      expect(result.value?.integrations[0]?.statusLabel).toBe('Verbunden');
    });

    it('sollte CB OPEN auf "unterbrochen" mappen', async () => {
      // Given (Arrange): Aktive Credential mit gueltigem Token, CB OPEN
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.integrations[0]?.status).toBe('unterbrochen');
      expect(result.value?.integrations[0]?.statusLabel).toBe('Unterbrochen');
    });

    it('sollte CB HALF_OPEN auf "wird_ueberprueft" mappen', async () => {
      // Given (Arrange): Aktive Credential mit gueltigem Token, CB HALF_OPEN
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.HALF_OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.integrations[0]?.status).toBe('wird_ueberprueft');
      expect(result.value?.integrations[0]?.statusLabel).toBe('Wird überprüft');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. Token-Ablauf ueberschreibt CB-Status (Prioritaet 3 > 4/5/6)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Token-Ablauf (erneute_anmeldung_erforderlich)', () => {
    it('sollte "erneute_anmeldung_erforderlich" zurueckgeben wenn Token abgelaufen, auch bei CB CLOSED', async () => {
      // Given (Arrange): Token expired, CB CLOSED
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isAccessTokenExpired: true })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.CLOSED })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.integrations[0]?.status).toBe('erneute_anmeldung_erforderlich');
      expect(result.value?.integrations[0]?.statusLabel).toBe('Erneute Anmeldung erforderlich');
    });

    it('sollte "erneute_anmeldung_erforderlich" zurueckgeben wenn Token abgelaufen, selbst bei CB OPEN', async () => {
      // Given (Arrange): Token expired hat hoehere Prio als CB OPEN
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isAccessTokenExpired: true })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.status).toBe('erneute_anmeldung_erforderlich');
    });

    it('sollte "erneute_anmeldung_erforderlich" zurueckgeben wenn Token abgelaufen, selbst bei CB HALF_OPEN', async () => {
      // Given (Arrange): Token expired hat hoehere Prio als CB HALF_OPEN
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isAccessTokenExpired: true })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.HALF_OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.status).toBe('erneute_anmeldung_erforderlich');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. Deaktivierte Integration (Prioritaet 2)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Deaktivierte Integration', () => {
    it('sollte "deaktiviert" zurueckgeben wenn Integration inaktiv, auch bei CB CLOSED', async () => {
      // Given (Arrange): isActive=false, CB CLOSED
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isActive: false })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.CLOSED })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.integrations[0]?.status).toBe('deaktiviert');
      expect(result.value?.integrations[0]?.statusLabel).toBe('Deaktiviert');
      expect(result.value?.integrations[0]?.isActive).toBe(false);
    });

    it('sollte "deaktiviert" vor "erneute_anmeldung_erforderlich" priorisieren (Prio 2 > 3)', async () => {
      // Given (Arrange): isActive=false UND Token expired → deaktiviert gewinnt
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isActive: false, isAccessTokenExpired: true })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.status).toBe('deaktiviert');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. Keine Credentials (nicht_konfiguriert, hoechste Prioritaet)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Keine Credentials (nicht_konfiguriert)', () => {
    it('sollte "nicht_konfiguriert" zurueckgeben wenn keine Credential existiert', async () => {
      // Given (Arrange): Repository gibt undefined zurueck
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(undefined));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.integrations[0]?.status).toBe('nicht_konfiguriert');
      expect(result.value?.integrations[0]?.statusLabel).toBe('Nicht konfiguriert');
      expect(result.value?.integrations[0]?.hasCredentials).toBe(false);
    });

    it('sollte "nicht_konfiguriert" vor allen anderen Status priorisieren (hoechste Prio)', async () => {
      // Given (Arrange): Keine Credential, CB OPEN
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(undefined));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.status).toBe('nicht_konfiguriert');
    });

    it('sollte hasCredentials=false und isActive=false setzen wenn keine Credential', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(undefined));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.hasCredentials).toBe(false);
      expect(result.value?.integrations[0]?.isActive).toBe(false);
    });

    it('sollte "nicht_konfiguriert" zurueckgeben wenn findByType Failure ist', async () => {
      // Given (Arrange): Repository gibt Failure zurueck → credential = undefined
      mockCredentialRepo.findByType.mockResolvedValue(Result.fail('DB Error'));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.integrations[0]?.status).toBe('nicht_konfiguriert');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. suggestedAction korrekt pro Status
  // ══════════════════════════════════════════════════════════════════════════════
  describe('suggestedAction pro Status', () => {
    it('sollte "Verbindung testen" fuer Status "verbunden" vorschlagen', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.CLOSED })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.suggestedAction).toBe('Verbindung testen');
    });

    it('sollte "Verbindung testen" fuer Status "unterbrochen" vorschlagen', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.suggestedAction).toBe('Verbindung testen');
    });

    it('sollte "Neu verbinden" fuer Status "erneute_anmeldung_erforderlich" vorschlagen', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isAccessTokenExpired: true })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.CLOSED })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.suggestedAction).toBe('Neu verbinden');
    });

    it('sollte null fuer Status "wird_ueberprueft" zurueckgeben', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.HALF_OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.suggestedAction).toBeNull();
    });

    it('sollte "Einstellungen öffnen" fuer Status "deaktiviert" vorschlagen', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isActive: false })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.CLOSED })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.suggestedAction).toBe('Einstellungen öffnen');
    });

    it('sollte "Einstellungen öffnen" fuer Status "nicht_konfiguriert" vorschlagen', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(undefined));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.suggestedAction).toBe('Einstellungen öffnen');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. Error Rate Calculation
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Error Rate Berechnung', () => {
    it('sollte errorRate=0 zurueckgeben wenn keine Calls (totalCount=0)', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ failureCount: 0, successCount: 0 })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.errorRate).toBe(0);
    });

    it('sollte errorRate=100 zurueckgeben wenn nur Failures', async () => {
      // Given (Arrange): 5 Failures, 0 Successes → 100%
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ failureCount: 5, successCount: 0 })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.errorRate).toBe(100);
    });

    it('sollte errorRate=0 zurueckgeben wenn nur Successes', async () => {
      // Given (Arrange): 0 Failures, 10 Successes → 0%
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ failureCount: 0, successCount: 10 })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.errorRate).toBe(0);
    });

    it('sollte errorRate korrekt auf ganze Zahl runden (50%)', async () => {
      // Given (Arrange): 3 Failures, 3 Successes → 50%
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ failureCount: 3, successCount: 3 })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.errorRate).toBe(50);
    });

    it('sollte errorRate korrekt runden bei nicht-ganzzahligem Ergebnis', async () => {
      // Given (Arrange): 1 Failure, 2 Successes → 33.33% → 33
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ failureCount: 1, successCount: 2 })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.errorRate).toBe(33);
    });

    it('sollte failureCount korrekt durchreichen', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ failureCount: 7, successCount: 3 })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.failureCount).toBe(7);
    });

    it('sollte errorRate=0 und failureCount=0 bei fehlendem CB-Status', async () => {
      // Given (Arrange): Kein CB-Status registriert fuer hiorg-server
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.errorRate).toBe(0);
      expect(result.value?.integrations[0]?.failureCount).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 7. Timestamps: lastSuccessAt, lastFailureAt, lastTestedAt
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Timestamps (lastSuccessAt/lastFailureAt/lastTestedAt)', () => {
    it('sollte lastSuccessAt aus CB-Status durchreichen', async () => {
      // Given (Arrange)
      const lastSuccess = '2026-03-23T10:00:00.000Z';
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ lastSuccess })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.lastSuccessAt).toBe(lastSuccess);
    });

    it('sollte lastFailureAt aus CB-Status durchreichen', async () => {
      // Given (Arrange)
      const lastFailure = '2026-03-23T09:55:00.000Z';
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ lastFailure })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.lastFailureAt).toBe(lastFailure);
    });

    it('sollte lastTestedAt aus Credential durchreichen (als ISO String)', async () => {
      // Given (Arrange)
      const lastTestedAt = new Date('2026-03-23T08:00:00.000Z');
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ lastTestedAt })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus()]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.lastTestedAt).toBe('2026-03-23T08:00:00.000Z');
    });

    it('sollte lastSuccessAt=null zurueckgeben wenn kein CB-Status', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.lastSuccessAt).toBeNull();
    });

    it('sollte lastFailureAt=null zurueckgeben wenn kein CB-Status', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.lastFailureAt).toBeNull();
    });

    it('sollte lastTestedAt=null zurueckgeben wenn Credential kein lastTestedAt hat', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ lastTestedAt: undefined })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus()]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.lastTestedAt).toBeNull();
    });

    it('sollte lastTestedAt=null zurueckgeben wenn keine Credential existiert', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(undefined));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.lastTestedAt).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 8. Integration Metadaten (serviceKey, displayName, CB State)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Integration Metadaten', () => {
    it('sollte hiorg-server als bekannte Integration enthalten', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus()]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.integrations).toHaveLength(1);
      expect(result.value?.integrations[0]?.serviceKey).toBe('hiorg-server');
      expect(result.value?.integrations[0]?.displayName).toBe('HiOrg-Server');
    });

    it('sollte circuitBreakerState korrekt durchreichen', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus({ state: CircuitBreakerStateEnum.OPEN })]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.circuitBreakerState).toBe(CircuitBreakerStateEnum.OPEN);
    });

    it('sollte circuitBreakerState=CLOSED als Default verwenden wenn kein CB registriert', async () => {
      // Given (Arrange): Kein CB-Status fuer hiorg-server → Default CLOSED
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.circuitBreakerState).toBe(CircuitBreakerStateEnum.CLOSED);
    });

    it('sollte hasCredentials=true setzen wenn Credential existiert', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential()));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus()]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.hasCredentials).toBe(true);
    });

    it('sollte isActive=true setzen wenn Credential aktiv ist', async () => {
      // Given (Arrange)
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isActive: true })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus()]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.value?.integrations[0]?.isActive).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 9. Error Handling
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Error Handling', () => {
    it('sollte Result.fail zurueckgeben wenn circuitBreaker.getAllStatus wirft', async () => {
      // Given (Arrange)
      mockCircuitBreaker.getAllStatus.mockImplementation(() => {
        throw new Error('Circuit Breaker Service crashed');
      });

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Circuit Breaker Service crashed');
    });

    it('sollte Result.fail zurueckgeben wenn credentialRepository.findByType wirft', async () => {
      // Given (Arrange)
      mockCircuitBreaker.getAllStatus.mockReturnValue([createMockCbStatus()]);
      mockCredentialRepo.findByType.mockRejectedValue(new Error('DB connection lost'));

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB connection lost');
    });

    it('sollte nicht-Error Exceptions graceful behandeln', async () => {
      // Given (Arrange)
      mockCircuitBreaker.getAllStatus.mockImplementation(() => {
        throw 'String error';
      });

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Unbekannt');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 10. Vollstaendige Status-Prioritaet End-to-End
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Status-Prioritaet (vollstaendiger Durchlauf)', () => {
    it('sollte alle Status-Felder korrekt fuer "verbunden" aufbauen', async () => {
      // Given (Arrange): Alles healthy
      const lastTestedAt = new Date('2026-03-23T12:00:00.000Z');
      mockCredentialRepo.findByType.mockResolvedValue(Result.ok(createMockCredential({ isActive: true, isAccessTokenExpired: false, lastTestedAt })));
      mockCircuitBreaker.getAllStatus.mockReturnValue([
        createMockCbStatus({
          state: CircuitBreakerStateEnum.CLOSED,
          failureCount: 1,
          successCount: 9,
          lastSuccess: '2026-03-23T12:00:00.000Z',
          lastFailure: '2026-03-23T11:00:00.000Z',
        }),
      ]);

      // When (Act)
      const result = await handler.execute(createQuery());

      // Then (Assert)
      const item = result.value?.integrations[0];
      expect(item).toEqual({
        serviceKey: 'hiorg-server',
        displayName: 'HiOrg-Server',
        status: 'verbunden',
        statusLabel: 'Verbunden',
        circuitBreakerState: CircuitBreakerStateEnum.CLOSED,
        failureCount: 1,
        errorRate: 10,
        lastSuccessAt: '2026-03-23T12:00:00.000Z',
        lastFailureAt: '2026-03-23T11:00:00.000Z',
        lastTestedAt: '2026-03-23T12:00:00.000Z',
        hasCredentials: true,
        isActive: true,
        suggestedAction: 'Verbindung testen',
      });
    });
  });
});

describe('GetIntegrationOverviewQuery', () => {
  describe('create()', () => {
    it('sollte Query erfolgreich erstellen', () => {
      // Given & When
      const result = GetIntegrationOverviewQuery.create();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
    });
  });
});
