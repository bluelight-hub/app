import { AuthApi, Configuration, HealthApi } from '@bluelight-hub/shared/client';

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
export class BackendApi {
  private readonly configuration: Configuration;
  private readonly healthApi: HealthApi;
  private readonly authApi: AuthApi;

  /**
   * Erstellt eine neue Instanz der BackendApi-Klasse
   *
   * Initialisiert die Konfiguration mit der Backend-URL aus den Umgebungsvariablen
   * und erstellt gecachte Instanzen der API-Clients für optimale Performance.
   */
  constructor() {
    // Konfiguration mit der Backend-URL aus den Umgebungsvariablen
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    this.configuration = new Configuration({
      basePath: baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl,
      fetchApi: fetch,
      credentials: 'include', // Für Cookie-basierte Authentifizierung
    });

    // API-Instanzen werden einmalig erstellt und gecacht
    this.healthApi = new HealthApi(this.configuration);
    this.authApi = new AuthApi(this.configuration);
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
}
