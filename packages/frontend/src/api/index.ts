import { AuthenticationApi } from '@bluelight-hub/shared/client/apis/AuthenticationApi';
import { AuditLogsApi } from '@bluelight-hub/shared/client/apis/AuditLogsApi';
import { EinsatzApi } from '@bluelight-hub/shared/client/apis/EinsatzApi';
import { EinsatztagebuchApi } from '@bluelight-hub/shared/client/apis/EinsatztagebuchApi';
import { HealthApi } from '@bluelight-hub/shared/client/apis/HealthApi';
import { SecurityApi } from '@bluelight-hub/shared/client/apis/SecurityApi';
import { SecurityLogsApi } from '@bluelight-hub/shared/client/apis/SecurityLogsApi';
import { SecurityMetricsApi } from '@bluelight-hub/shared/client/apis/SecurityMetricsApi';
import { SessionsApi } from '@bluelight-hub/shared/client/apis/SessionsApi';
import { ThreatDetectionApi } from '@bluelight-hub/shared/client/apis/ThreatDetectionApi';
import { apiConfiguration } from '../utils/fetch';
import { logger } from '../utils/logger';

/**
 * API Client singleton for accessing backend endpoints
 */
class API {
  private static instance: API;
  private authApi: AuthenticationApi;
  private auditLogsApi: AuditLogsApi;
  private healthApi: HealthApi;
  private einsatztagebuchApi: EinsatztagebuchApi;
  private einsatzApi: EinsatzApi;
  private securityApi: SecurityApi;
  private securityLogsApi: SecurityLogsApi;
  private securityMetricsApi: SecurityMetricsApi;
  private sessionsApi: SessionsApi;
  private threatDetectionApi: ThreatDetectionApi;

  private constructor() {
    try {
      logger.debug('Initializing API with configuration', {
        basePath: apiConfiguration.basePath,
        middlewareCount: apiConfiguration.middleware.length,
      });

      this.authApi = new AuthenticationApi(apiConfiguration);
      this.auditLogsApi = new AuditLogsApi(apiConfiguration);
      this.healthApi = new HealthApi(apiConfiguration);
      this.einsatztagebuchApi = new EinsatztagebuchApi(apiConfiguration);
      this.einsatzApi = new EinsatzApi(apiConfiguration);
      this.securityApi = new SecurityApi(apiConfiguration);
      this.securityLogsApi = new SecurityLogsApi(apiConfiguration);
      this.securityMetricsApi = new SecurityMetricsApi(apiConfiguration);
      this.sessionsApi = new SessionsApi(apiConfiguration);
      this.threatDetectionApi = new ThreatDetectionApi(apiConfiguration);

      if (!apiConfiguration.basePath || apiConfiguration.basePath.trim() === '') {
        throw new Error('API base path is not configured properly');
      }

      this._isInitialized = true;
      logger.info('API client successfully initialized');
    } catch (error) {
      logger.error('Failed to initialize API client', {
        error: error instanceof Error ? error.message : String(error),
      });

      this.authApi = new AuthenticationApi(apiConfiguration);
      this.auditLogsApi = new AuditLogsApi(apiConfiguration);
      this.healthApi = new HealthApi(apiConfiguration);
      this.einsatztagebuchApi = new EinsatztagebuchApi(apiConfiguration);
      this.einsatzApi = new EinsatzApi(apiConfiguration);
      this.securityApi = new SecurityApi(apiConfiguration);
      this.securityLogsApi = new SecurityLogsApi(apiConfiguration);
      this.securityMetricsApi = new SecurityMetricsApi(apiConfiguration);
      this.sessionsApi = new SessionsApi(apiConfiguration);
      this.threatDetectionApi = new ThreatDetectionApi(apiConfiguration);
    }
  }

  private _isInitialized = false;

  public get isInitialized() {
    return this._isInitialized;
  }

  public get auth() {
    return this.authApi;
  }

  public get auditLogs() {
    return this.auditLogsApi;
  }

  public get health() {
    return this.healthApi;
  }

  public get etb() {
    return this.einsatztagebuchApi;
  }

  public get einsatz() {
    return this.einsatzApi;
  }

  public get security() {
    return this.securityApi;
  }

  public get securityLogs() {
    return this.securityLogsApi;
  }

  public get securityMetrics() {
    return this.securityMetricsApi;
  }

  public get sessions() {
    return this.sessionsApi;
  }

  public get threatDetection() {
    return this.threatDetectionApi;
  }

  public static getInstance(): API {
    if (!API.instance) {
      API.instance = new API();
    }
    return API.instance;
  }
}

export const api = API.getInstance();
