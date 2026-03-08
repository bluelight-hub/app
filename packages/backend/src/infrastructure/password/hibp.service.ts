import { LOGGER } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

/**
 * Result eines HIBP-Checks
 */
export interface HibpCheckResult {
  /** Ob das Passwort in einem bekannten Datenleck gefunden wurde */
  isCompromised: boolean;
  /** Anzahl der Funde (0 wenn nicht kompromittiert) */
  occurrences: number;
  /** Fehler bei der Prüfung (API nicht erreichbar, etc.) */
  error?: string;
}

/**
 * Have I Been Pwned (HIBP) Password Check Service
 *
 * Implementiert den K-Anonymity Model gemäß HIBP API v3:
 * - SHA-1 Hash des Passworts erstellen
 * - Nur die ersten 5 Zeichen des Hashes an HIBP senden
 * - HIBP antwortet mit allen Hash-Suffixen die mit diesem Prefix beginnen
 * - Lokal prüfen ob der vollständige Hash in der Antwort enthalten ist
 *
 * **Datenschutz:** Das Passwort oder sein vollständiger Hash verlässt niemals den Server.
 *
 * **NIST SP 800-63B-4 Compliance:** Diese Prüfung ist OPTIONAL aber empfohlen.
 * Fehler bei der API-Kommunikation blockieren die Passwort-Validierung NICHT.
 *
 * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
@Injectable()
export class HibpService {
  private readonly HIBP_API_URL = 'https://api.pwnedpasswords.com/range/';
  private readonly TIMEOUT_MS = 10000; // 10 Sekunden Timeout

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  /**
   * Prüft ob ein Passwort in bekannten Datenlecks vorkommt.
   *
   * Verwendet K-Anonymity Model - das Passwort verlässt niemals den Server.
   *
   * @param password - Das zu prüfende Passwort (Klartext)
   * @returns Promise mit Check-Ergebnis
   */
  async checkPassword(password: string): Promise<HibpCheckResult> {
    try {
      // SECURITY NOTE: SHA-1 ist hier absichtlich und sicher verwendet.
      // Dies ist NICHT für Passwort-Speicherung - Passwörter werden separat mit bcrypt gehasht.
      // SHA-1 ist von der HIBP API-Spezifikation (k-Anonymity Protokoll) vorgeschrieben.
      // Nur die ersten 5 Zeichen des Hashes werden an die API gesendet.
      // CodeQL-Warnung ist ein False Positive (lgtm[js/insufficient-password-hash])
      const sha1Hash = createHash('sha1').update(password).digest('hex').toUpperCase();

      // K-Anonymity: Nur die ersten 5 Zeichen senden
      const hashPrefix = sha1Hash.substring(0, 5);
      const hashSuffix = sha1Hash.substring(5);

      // HIBP API abfragen
      const response = await this.fetchWithTimeout(`${this.HIBP_API_URL}${hashPrefix}`, {
        headers: {
          'User-Agent': 'bluelight-hub-password-check',
          'Add-Padding': 'true', // Padding für zusätzliche Privatsphäre
        },
      });

      if (!response.ok) {
        this.logger.warn(`HIBP API returned status ${response.status}`);
        return {
          isCompromised: false,
          occurrences: 0,
          error: `HIBP API error: ${response.status}`,
        };
      }

      const responseText = await response.text();

      // Antwort parsen: Format ist "HASH_SUFFIX:COUNT" pro Zeile
      const lines = responseText.split('\n');
      for (const line of lines) {
        const [suffix, countStr] = line.split(':');
        if (suffix?.trim().toUpperCase() === hashSuffix) {
          const occurrences = parseInt(countStr?.trim() || '0', 10);
          this.logger.debug(`Password found in HIBP database (${occurrences} occurrences)`);
          return {
            isCompromised: true,
            occurrences,
          };
        }
      }

      // Passwort nicht in Datenlecks gefunden
      return {
        isCompromised: false,
        occurrences: 0,
      };
    } catch (error) {
      // Bei Fehlern (Netzwerk, Timeout, etc.) blockieren wir NICHT
      // NIST erlaubt Fallback wenn externe Services nicht erreichbar sind
      this.logger.warn(`HIBP check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isCompromised: false,
        occurrences: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch mit Timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
