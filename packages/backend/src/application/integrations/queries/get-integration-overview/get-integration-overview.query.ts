/**
 * GetIntegrationOverviewQuery - Aggregiert Status aller externen Integrationen.
 *
 * @module application/integrations/queries/get-integration-overview
 */

import { Result } from '@domain/common/result';

/**
 * Query zum Abrufen der Integrationsübersicht.
 *
 * Aggregiert Circuit Breaker Status + IntegrationCredential DB-Status
 * pro externer Integration.
 */
export class GetIntegrationOverviewQuery {
  private constructor() {}

  /**
   * Factory-Methode.
   */
  static create(): Result<GetIntegrationOverviewQuery> {
    return Result.ok(new GetIntegrationOverviewQuery());
  }
}
