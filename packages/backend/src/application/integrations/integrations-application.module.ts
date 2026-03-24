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
import { ResilienceModule } from '@infrastructure/resilience/resilience.module';

// Services
import { HiOrgTokenRefreshService } from '@application/integrations/services';

// Command Handlers
import { TestHiOrgConnectionHandler } from '@application/integrations/commands/test-hiorg-connection';
import { InitiateOAuthFlowHandler } from '@application/integrations/commands/initiate-oauth-flow';
import { ProcessOAuthCallbackHandler } from '@application/integrations/commands/process-oauth-callback';
import { RefreshHiOrgTokenHandler } from '@application/integrations/commands/refresh-hiorg-token';
import { DisconnectHiOrgHandler } from '@application/integrations/commands/disconnect-hiorg';
import { SaveQualifikationMappingHandler } from '@application/integrations/commands/save-qualifikation-mapping';
import { AutoMatchQualifikationenHandler } from '@application/integrations/commands/auto-match-qualifikationen';
import { ImportSelectedPersonsHandler } from '@application/integrations/commands/import-selected-persons';
import { BatchSaveQualifikationMappingsHandler } from '@application/integrations/commands/batch-save-qualifikation-mappings';

// Query Handlers
import { GetHiOrgCredentialsHandler } from '@application/integrations/queries/get-hiorg-credentials';
import { PreviewHiOrgPersonsHandler } from '@application/integrations/queries/preview-hiorg-persons';
import { GetQualifikationMappingsHandler } from '@application/integrations/queries/get-qualifikation-mappings';
import { GetIntegrationOverviewHandler } from '@application/integrations/queries/get-integration-overview';

/**
 * Application Module für Integrations-Features.
 *
 * Registriert alle Command und Query Handlers für HiOrg-Server Integration.
 * Verwendet ausschließlich OAuth2 für die Authentifizierung.
 * Nutzt HiOrgTokenRefreshService für automatisches Token-Refresh.
 */
@Module({
  imports: [IntegrationsInfrastructureModule, KraefteInfrastructureModule, ResilienceModule],
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
    RefreshHiOrgTokenHandler,
    DisconnectHiOrgHandler,
    SaveQualifikationMappingHandler,
    AutoMatchQualifikationenHandler,
    ImportSelectedPersonsHandler,
    BatchSaveQualifikationMappingsHandler,
    // Query Handlers
    GetHiOrgCredentialsHandler,
    PreviewHiOrgPersonsHandler,
    GetQualifikationMappingsHandler,
    GetIntegrationOverviewHandler,
  ],
  exports: [
    // Export handlers and services for use in Controller
    HiOrgTokenRefreshService,
    TestHiOrgConnectionHandler,
    InitiateOAuthFlowHandler,
    ProcessOAuthCallbackHandler,
    RefreshHiOrgTokenHandler,
    DisconnectHiOrgHandler,
    SaveQualifikationMappingHandler,
    AutoMatchQualifikationenHandler,
    ImportSelectedPersonsHandler,
    BatchSaveQualifikationMappingsHandler,
    GetHiOrgCredentialsHandler,
    PreviewHiOrgPersonsHandler,
    GetQualifikationMappingsHandler,
    GetIntegrationOverviewHandler,
  ],
})
export class IntegrationsApplicationModule {}
