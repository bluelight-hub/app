/**
 * GetIntegrationOverviewHandler - Aggregiert CB-Status + Credentials zu Integrationsübersicht.
 *
 * Status-Mapping-Logik (Prio-basiert, schlimmster Status gewinnt):
 * 1. Credentials nicht vorhanden -> "nicht_konfiguriert"
 * 2. Integration deaktiviert (isActive=false) -> "deaktiviert"
 * 3. Token abgelaufen (accessTokenExpiresAt < now) -> "erneute_anmeldung_erforderlich"
 * 4. Circuit Breaker OPEN -> "unterbrochen"
 * 5. Circuit Breaker HALF_OPEN -> "wird_ueberprueft"
 * 6. Circuit Breaker CLOSED -> "verbunden"
 *
 * @module application/integrations/queries/get-integration-overview
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { INTEGRATION_TYPES, type IIntegrationCredentialRepository, type IntegrationCredential } from '@domain/integrations';
import { INTEGRATIONS, RESILIENCE } from '@infrastructure/di-tokens';
import { type CircuitStatus, CircuitBreakerStateEnum, type ICircuitBreakerReader } from '@domain/ports/i-circuit-breaker-reader.port';
import type { GetIntegrationOverviewQuery } from './get-integration-overview.query';

/**
 * Aggregierter Status einer Integration.
 */
export type IntegrationStatus = 'verbunden' | 'unterbrochen' | 'erneute_anmeldung_erforderlich' | 'wird_ueberprueft' | 'deaktiviert' | 'nicht_konfiguriert';

/**
 * Human-readable Status-Labels.
 */
const STATUS_LABELS: Record<IntegrationStatus, string> = {
  verbunden: 'Verbunden',
  unterbrochen: 'Unterbrochen',
  erneute_anmeldung_erforderlich: 'Erneute Anmeldung erforderlich',
  wird_ueberprueft: 'Wird überprüft',
  deaktiviert: 'Deaktiviert',
  nicht_konfiguriert: 'Nicht konfiguriert',
};

/**
 * Empfohlene Aktion pro Status.
 */
const SUGGESTED_ACTIONS: Record<IntegrationStatus, string | null> = {
  verbunden: 'Verbindung testen',
  unterbrochen: 'Verbindung testen',
  erneute_anmeldung_erforderlich: 'Neu verbinden',
  wird_ueberprueft: null,
  deaktiviert: 'Einstellungen öffnen',
  nicht_konfiguriert: 'Einstellungen öffnen',
};

/**
 * Bekannte externe Integrationen mit Metadaten.
 */
const KNOWN_INTEGRATIONS = [{ serviceKey: 'hiorg-server', displayName: 'HiOrg-Server', integrationType: INTEGRATION_TYPES.HIORG_SERVER }] as const;

/**
 * DTO fuer eine einzelne Integration in der Uebersicht.
 */
export interface IntegrationOverviewItemDto {
  serviceKey: string;
  displayName: string;
  status: IntegrationStatus;
  statusLabel: string;
  circuitBreakerState: CircuitBreakerStateEnum;
  failureCount: number;
  errorRate: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastTestedAt: string | null;
  hasCredentials: boolean;
  isActive: boolean;
  suggestedAction: string | null;
}

/**
 * DTO fuer die gesamte Integrationsübersicht.
 */
export interface IntegrationOverviewDto {
  integrations: IntegrationOverviewItemDto[];
}

/**
 * Handler fuer GetIntegrationOverviewQuery.
 */
@Injectable()
export class GetIntegrationOverviewHandler {
  constructor(
    @Inject(INTEGRATIONS.CREDENTIAL_REPOSITORY)
    private readonly credentialRepository: IIntegrationCredentialRepository,
    @Inject(RESILIENCE.CIRCUIT_BREAKER)
    private readonly circuitBreaker: ICircuitBreakerReader,
  ) {}

  /**
   * Fuehrt die Query aus.
   */
  async execute(_query: GetIntegrationOverviewQuery): Promise<Result<IntegrationOverviewDto>> {
    try {
      const cbStatuses = this.circuitBreaker.getAllStatus();
      const cbMap = new Map<string, CircuitStatus>();
      for (const status of cbStatuses) {
        cbMap.set(status.serviceName, status);
      }

      const integrations: IntegrationOverviewItemDto[] = [];

      for (const integration of KNOWN_INTEGRATIONS) {
        const credentialResult = await this.credentialRepository.findByType(integration.integrationType);
        const credential = credentialResult.isSuccess ? credentialResult.value : undefined;
        const cbStatus = cbMap.get(integration.serviceKey);

        integrations.push(this.buildIntegrationItem(integration.serviceKey, integration.displayName, credential, cbStatus));
      }

      return Result.ok({ integrations });
    } catch (error) {
      return Result.fail(`Fehler beim Laden der Integrationsübersicht: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }

  /**
   * Baut ein IntegrationOverviewItem aus Credential + CB-Status.
   */
  private buildIntegrationItem(serviceKey: string, displayName: string, credential: IntegrationCredential | undefined, cbStatus: CircuitStatus | undefined): IntegrationOverviewItemDto {
    const cbState = cbStatus?.state ?? CircuitBreakerStateEnum.CLOSED;
    const failureCount = cbStatus?.failureCount ?? 0;
    const successCount = cbStatus?.successCount ?? 0;
    const totalCount = failureCount + successCount;
    const errorRate = totalCount > 0 ? Math.round((failureCount / totalCount) * 100) : 0;

    const hasCredentials = !!credential;
    const isActive = credential?.isActive ?? false;

    const status = this.determineStatus(credential, cbState);

    return {
      serviceKey,
      displayName,
      status,
      statusLabel: STATUS_LABELS[status],
      circuitBreakerState: cbState,
      failureCount,
      errorRate,
      lastSuccessAt: cbStatus?.lastSuccess ?? null,
      lastFailureAt: cbStatus?.lastFailure ?? null,
      lastTestedAt: credential?.lastTestedAt?.toISOString() ?? null,
      hasCredentials,
      isActive,
      suggestedAction: SUGGESTED_ACTIONS[status],
    };
  }

  /**
   * Bestimmt den aggregierten Status basierend auf Prioritaet.
   *
   * Reihenfolge (schlimmster Status gewinnt):
   * 1. Keine Credentials -> nicht_konfiguriert
   * 2. Deaktiviert -> deaktiviert
   * 3. Token abgelaufen -> erneute_anmeldung_erforderlich
   * 4. CB OPEN -> unterbrochen
   * 5. CB HALF_OPEN -> wird_ueberprueft
   * 6. CB CLOSED -> verbunden
   */
  private determineStatus(credential: IntegrationCredential | undefined, cbState: CircuitBreakerStateEnum): IntegrationStatus {
    if (!credential) {
      return 'nicht_konfiguriert';
    }

    if (!credential.isActive) {
      return 'deaktiviert';
    }

    if (credential.isAccessTokenExpired) {
      return 'erneute_anmeldung_erforderlich';
    }

    if (cbState === CircuitBreakerStateEnum.OPEN) {
      return 'unterbrochen';
    }

    if (cbState === CircuitBreakerStateEnum.HALF_OPEN) {
      return 'wird_ueberprueft';
    }

    return 'verbunden';
  }
}
