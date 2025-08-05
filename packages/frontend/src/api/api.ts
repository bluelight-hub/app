import { AuthApi, Configuration, HealthApi, UserManagementApi } from '@bluelight-hub/shared/client';
import { logger } from '@/utils/logger';

/**
 * Ermittelt die Basis-URL für die API basierend auf der Umgebung
 *
 * @returns Die Basis-URL ohne abschließenden Slash
 */
export const getBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl && configuredUrl.trim() !== '') {
    logger.debug('Using configured API URL', { configuredUrl });

    if (configuredUrl.endsWith('/')) {
      return configuredUrl.slice(0, -1);
    }

    return configuredUrl;
  }
  // Fallback für Entwicklung
  const fallbackUrl = 'http://localhost:3000';
  logger.debug('Using fallback API URL', { fallbackUrl });
  return fallbackUrl;
};

/**
 * Zentrale Backend-API-Klasse für die Kommunikation mit dem BlueLight Hub Backend
 *
 * Diese Klasse stellt eine einheitliche Schnittstelle für alle API-Endpunkte bereit
 * und verwaltet die Konfiguration sowie Instanziierung der API-Clients.
 *
 * @example
 * ```typescript
 * const api = new BackendApi();
 * const healthStatus = await api.health().checkHealth();
 * ```
 */
class BackendApi {
  private readonly configuration: Configuration;
  private readonly healthApi: HealthApi;
  private readonly authApi: AuthApi;
  private readonly userManagementApi: UserManagementApi;

  /**
   * Erstellt eine neue Instanz der BackendApi-Klasse
   *
   * Initialisiert die Konfiguration mit der Backend-URL aus den Umgebungsvariablen
   * und erstellt gecachte Instanzen der API-Clients für optimale Performance.
   */
  constructor() {
    this.configuration = new Configuration({
      basePath: getBaseUrl(),
      fetchApi: fetch,
      credentials: 'include',
    });

    // API-Instanzen werden einmalig erstellt und gecacht
    this.healthApi = new HealthApi(this.configuration);
    this.authApi = new AuthApi(this.configuration);
    this.userManagementApi = new UserManagementApi(this.configuration);
  }

  /**
   * Gibt die gecachte Health-API-Instanz zurück
   *
   * @returns Die Health-API-Instanz für Gesundheitsprüfungen des Backends
   */
  health(): HealthApi {
    return this.healthApi;
  }

  /**
   * Gibt die gecachte Auth-API-Instanz zurück
   *
   * @returns Die Auth-API-Instanz für Authentifizierung und Benutzerregistrierung
   */
  auth(): AuthApi {
    return this.authApi;
  }

  /**
   * Gibt die gecachte UserManagement-API-Instanz zurück
   *
   * @returns Die UserManagement-API-Instanz für Benutzerverwaltung durch Administratoren
   */
  userManagement(): UserManagementApi {
    return this.userManagementApi;
  }
}

/**
 * Globale API-Konfiguration für die Verwendung außerhalb der BackendApi-Klasse
 *
 * Diese Konfiguration kann verwendet werden, wenn API-Clients direkt instanziiert werden müssen.
 */
export const apiConfiguration = new Configuration({
  basePath: getBaseUrl(),
  fetchApi: fetch,
  credentials: 'include',
});

/**
 * Singleton-Instanz der BackendApi für die Verwendung in der gesamten Anwendung
 *
 * @example
 * ```typescript
 * import { api } from '@/api/api';
 * const users = await api.userManagement().userManagementControllerFindAllVAlpha();
 * ```
 */
export const api = new BackendApi();
