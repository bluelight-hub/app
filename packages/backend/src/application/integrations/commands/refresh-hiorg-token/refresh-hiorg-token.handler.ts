/**
 * RefreshHiOrgTokenHandler - Manuelles Token-Refresh für HiOrg-Server.
 *
 * Delegiert an HiOrgTokenRefreshService und gibt aktualisierten Status zurück.
 *
 * @module application/integrations/commands/refresh-hiorg-token
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { INTEGRATION_ERROR_CODES, IntegrationError } from '@domain/integrations';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { HiOrgTokenRefreshService } from '@application/integrations/services';
import type { RefreshHiOrgTokenCommand } from './refresh-hiorg-token.command';

/**
 * Ergebnis des manuellen Token-Refresh.
 */
export interface RefreshTokenResultDto {
  /** War der Refresh erfolgreich? */
  refreshed: boolean;
  /** Neuer Ablaufzeitpunkt des Access Tokens */
  accessTokenExpiresAt: Date;
  /** Ist ein Refresh Token vorhanden? */
  hasRefreshToken: boolean;
}

@Injectable()
export class RefreshHiOrgTokenHandler {
  constructor(
    @Inject(LOGGER)
    private readonly logger: ILogger,
    private readonly tokenRefresh: HiOrgTokenRefreshService,
  ) {}

  async execute(command: RefreshHiOrgTokenCommand): Promise<Result<RefreshTokenResultDto>> {
    this.logger.log(`Manueller Token-Refresh ausgelöst von ${command.userId}`);

    const tokenResult = await this.tokenRefresh.getValidAccessToken();
    if (tokenResult.isFailure) {
      return Result.fail(tokenResult.error ?? IntegrationError.format(INTEGRATION_ERROR_CODES.OAUTH_TOKEN_REFRESH_FAILED, 'Token-Refresh fehlgeschlagen'));
    }

    const tokenData = tokenResult.value;
    if (!tokenData) {
      return Result.fail(IntegrationError.format(INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND, 'Kein Access Token verfügbar'));
    }

    const { credential, wasRefreshed } = tokenData;

    this.logger.log(`Token-Refresh abgeschlossen: ${wasRefreshed ? 'Token wurde erneuert' : 'Token war noch gültig'}`);

    return Result.ok({
      refreshed: wasRefreshed,
      accessTokenExpiresAt: credential.accessTokenExpiresAt ?? new Date(),
      hasRefreshToken: credential.hasRefreshToken,
    });
  }
}
