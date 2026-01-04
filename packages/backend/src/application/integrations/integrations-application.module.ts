/**
 * IntegrationsApplicationModule - Registriert Application Layer Handler.
 *
 * @module application/integrations
 */

import { Module } from '@nestjs/common';
import { IntegrationsInfrastructureModule } from '@infrastructure/integrations/integrations-infrastructure.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

// Services
import { HiOrgTokenRefreshService } from './services/hiorg-token-refresh.service';

// Command Handlers
import { TestHiOrgConnectionHandler } from './commands/test-hiorg-connection/test-hiorg-connection.handler';
import { InitiateOAuthFlowHandler } from './commands/initiate-oauth-flow/initiate-oauth-flow.handler';
import { ProcessOAuthCallbackHandler } from './commands/process-oauth-callback/process-oauth-callback.handler';
import { SaveQualifikationMappingHandler } from './commands/save-qualifikation-mapping/save-qualifikation-mapping.handler';
import { AutoMatchQualifikationenHandler } from './commands/auto-match-qualifikationen/auto-match-qualifikationen.handler';
import { ImportSelectedPersonsHandler } from './commands/import-selected-persons/import-selected-persons.handler';
import { BatchSaveQualifikationMappingsHandler } from './commands/batch-save-qualifikation-mappings/batch-save-qualifikation-mappings.handler';

// Query Handlers
import { GetHiOrgCredentialsHandler } from './queries/get-hiorg-credentials/get-hiorg-credentials.handler';
import { PreviewHiOrgPersonsHandler } from './queries/preview-hiorg-persons/preview-hiorg-persons.handler';
import { GetQualifikationMappingsHandler } from './queries/get-qualifikation-mappings/get-qualifikation-mappings.handler';

/**
 * Application Module für Integrations-Features.
 *
 * Registriert alle Command und Query Handlers für HiOrg-Server Integration.
 * Verwendet ausschließlich OAuth2 für die Authentifizierung.
 * Nutzt HiOrgTokenRefreshService für automatisches Token-Refresh.
 */
@Module({
  imports: [IntegrationsInfrastructureModule, KraefteInfrastructureModule],
  providers: [
    // Logger für Integrations Handlers
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Integrations'),
    },
    // Services
    HiOrgTokenRefreshService,
    // Command Handlers
    TestHiOrgConnectionHandler,
    InitiateOAuthFlowHandler,
    ProcessOAuthCallbackHandler,
    SaveQualifikationMappingHandler,
    AutoMatchQualifikationenHandler,
    ImportSelectedPersonsHandler,
    BatchSaveQualifikationMappingsHandler,
    // Query Handlers
    GetHiOrgCredentialsHandler,
    PreviewHiOrgPersonsHandler,
    GetQualifikationMappingsHandler,
  ],
  exports: [
    // Export handlers and services for use in Controller
    HiOrgTokenRefreshService,
    TestHiOrgConnectionHandler,
    InitiateOAuthFlowHandler,
    ProcessOAuthCallbackHandler,
    SaveQualifikationMappingHandler,
    AutoMatchQualifikationenHandler,
    ImportSelectedPersonsHandler,
    BatchSaveQualifikationMappingsHandler,
    GetHiOrgCredentialsHandler,
    PreviewHiOrgPersonsHandler,
    GetQualifikationMappingsHandler,
  ],
})
export class IntegrationsApplicationModule {}
