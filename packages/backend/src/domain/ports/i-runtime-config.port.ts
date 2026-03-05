/**
 * Port für Runtime-Konfigurationszugriff aus dem Application Layer.
 *
 * Application Services dürfen keine Infrastructure-Services direkt kennen.
 */
export interface IRuntimeConfigPort {
  getString(key: string, fallback?: string): string;
}
