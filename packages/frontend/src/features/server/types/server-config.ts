import type { ServerIconValue } from '../constants/server-icons';
import type { ServerColorValue } from '../utils/server-color.utils';

/**
 * Konfiguration eines einzelnen Backend-Servers.
 *
 * Enthält alle notwendigen Daten um eine Verbindung zu einem
 * Bluelight-Hub Backend aufzubauen und zu verwalten.
 */
export interface ServerConfig {
  /**
   * Eindeutige ID des Servers (UUID v4).
   */
  id: string;

  /**
   * Benutzerfreundlicher Name des Servers (z.B. "Produktiv-Server", "Test-Umgebung").
   */
  name: string;

  /**
   * Basis-URL des Backend-Servers (z.B. "https://api.example.com").
   * Muss ohne Trailing-Slash angegeben werden.
   */
  url: string;

  /**
   * Reduzierter Marker für einen zentral persistierten Server-Access-Token.
   * Der rohe Token liegt bewusst NICHT im Feature-Store.
   */
  accessToken?: string;

  /**
   * Gibt an, ob dies der Standard-Server ist.
   * Nur ein Server kann gleichzeitig als Standard markiert sein.
   */
  isDefault: boolean;

  /**
   * Zeitpunkt der Erstellung der Server-Konfiguration.
   */
  createdAt: string;

  /**
   * Zeitpunkt der letzten Verwendung des Servers.
   * Wird aktualisiert wenn eine Verbindung zum Server aufgebaut wird.
   */
  lastUsedAt: string | null;

  /**
   * Optionales Icon für visuelle Unterscheidung im UI.
   * Muss ein gültiger ServerIconValue sein (z.B. 'building', 'shield', 'server').
   */
  icon?: ServerIconValue;

  /**
   * Optionale Farbe für visuelle Unterscheidung im UI.
   * Muss ein gültiger ServerColorValue sein (z.B. 'sky', 'emerald', 'amber').
   */
  color?: ServerColorValue;
}

/**
 * Status einer Server-Verbindung.
 *
 * - `connected`: Server ist erreichbar und antwortet
 * - `disconnected`: Server ist nicht erreichbar oder antwortet nicht
 * - `checking`: Verbindung wird gerade geprüft
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

/**
 * Globaler State für Server-Verwaltung.
 *
 * Verwaltet alle konfigurierten Server, den aktiven Server
 * und deren Verbindungsstatus.
 */
export interface ServerState {
  /**
   * Liste aller konfigurierten Server.
   */
  servers: ServerConfig[];

  /**
   * ID des aktuell aktiven Servers.
   * Null wenn kein Server ausgewählt ist.
   */
  activeServerId: string | null;

  /**
   * Map der Verbindungsstatus für jeden Server.
   * Key ist die Server-ID, Value ist der ConnectionStatus.
   */
  connectionStatus: Map<string, ConnectionStatus>;

  /**
   * Gibt an, ob der Store bereits aus dem Storage hydratisiert wurde.
   * Verhindert Race Conditions beim App-Start.
   */
  isHydrated: boolean;
}
