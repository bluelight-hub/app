import { AuthenticationApi } from '@bluelight-hub/shared/client/apis/AuthenticationApi';
import { EinsatzApi } from '@bluelight-hub/shared/client/apis/EinsatzApi';
import { EinsatztagebuchApi } from '@bluelight-hub/shared/client/apis/EinsatztagebuchApi';
import { HealthApi } from '@bluelight-hub/shared/client/apis/HealthApi';
import { MFAApi } from '@bluelight-hub/shared/client/apis/MFAApi';
import { apiConfiguration } from '../utils/fetch';
import { logger } from '../utils/logger';

/**
 * API Client singleton for accessing backend endpoints
 */
class API {
  private static instance: API;
  private authApi: AuthenticationApi;
  private healthApi: HealthApi;
  private einsatztagebuchApi: EinsatztagebuchApi;
  private einsatzApi: EinsatzApi;
  private mfaApi: MFAApi;

  private constructor() {
    try {
      logger.debug('Initializing API with configuration', {
        basePath: apiConfiguration.basePath,
        middlewareCount: apiConfiguration.middleware.length,
      });

      this.authApi = new AuthenticationApi(apiConfiguration);
      this.healthApi = new HealthApi(apiConfiguration);
      this.einsatztagebuchApi = new EinsatztagebuchApi(apiConfiguration);
      this.einsatzApi = new EinsatzApi(apiConfiguration);
      this.mfaApi = new MFAApi(apiConfiguration);

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
      this.healthApi = new HealthApi(apiConfiguration);
      this.einsatztagebuchApi = new EinsatztagebuchApi(apiConfiguration);
      this.einsatzApi = new EinsatzApi(apiConfiguration);
      this.mfaApi = new MFAApi(apiConfiguration);
    }
  }

  private _isInitialized = false;

  public get isInitialized() {
    return this._isInitialized;
  }

  public get auth() {
    return this.authApi;
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

  public get mfa() {
    return this.mfaApi;
  }

  public static getInstance(): API {
    if (!API.instance) {
      API.instance = new API();
    }
    return API.instance;
  }
}

export const api = API.getInstance();
