/**
 * DisconnectHiOrgHandler - Trennt die HiOrg-Server Integration.
 *
 * Löscht die OAuth2 Credentials aus der Datenbank.
 *
 * @module application/integrations/commands/disconnect-hiorg
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { INTEGRATION_TYPES, type IIntegrationCredentialRepository } from '@domain/integrations';
import type { ILogger } from '@domain/ports/i-logger.port';
import { INTEGRATIONS, LOGGER } from '@infrastructure/di-tokens';
import type { DisconnectHiOrgCommand } from './disconnect-hiorg.command';

/**
 * Ergebnis der Trennung.
 */
export interface DisconnectResultDto {
  disconnected: boolean;
  disconnectedAt: Date;
}

@Injectable()
export class DisconnectHiOrgHandler {
  constructor(
    @Inject(LOGGER)
    private readonly logger: ILogger,
    @Inject(INTEGRATIONS.CREDENTIAL_REPOSITORY)
    private readonly repository: IIntegrationCredentialRepository,
  ) {}

  async execute(command: DisconnectHiOrgCommand): Promise<Result<DisconnectResultDto>> {
    this.logger.log(`HiOrg-Integration wird getrennt von Admin ${command.userId}`);

    const deleteResult = await this.repository.deleteByType(INTEGRATION_TYPES.HIORG_SERVER);
    if (deleteResult.isFailure) {
      this.logger.error(`Fehler beim Trennen der HiOrg-Integration: ${deleteResult.error}`);
      return Result.fail(deleteResult.error ?? 'Integration konnte nicht getrennt werden');
    }

    this.logger.log(`HiOrg-Integration erfolgreich getrennt von Admin ${command.userId}`);

    return Result.ok({
      disconnected: true,
      disconnectedAt: new Date(),
    });
  }
}
