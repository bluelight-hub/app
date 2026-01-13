import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import type { ServerAccessTokenUsedEvent } from '@domain/events/server-access-token-used.event';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { SERVER_ACCESS_TOKEN_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Event Handler für ServerAccessTokenUsedEvent mit In-Memory Debounce.
 *
 * Aktualisiert den lastUsedAt Zeitstempel eines Tokens in der Datenbank,
 * jedoch maximal einmal pro DEBOUNCE_MS (60 Sekunden) pro Token.
 *
 * **Warum Debounce?**
 * - Token können bei hoher API-Last sehr häufig verwendet werden
 * - Ohne Debounce würde jede Anfrage einen DB-Write verursachen
 * - 60 Sekunden Debounce reduziert DB-Last signifikant
 *
 * **Fire-and-Forget Pattern:**
 * - Fehler werden geloggt aber NICHT propagiert
 * - Token-Validierung wird NICHT durch lastUsedAt-Update blockiert
 * - Bei DB-Fehlern geht nur das Usage-Tracking verloren
 *
 * **@OnEvent Decorator:**
 * Dieser Handler ist NICHT framework-agnostisch wie andere Event Handler,
 * weil er direkt mit NestJS EventEmitter integriert ist. Das ist akzeptabel
 * für diesen einfachen Use Case (kein komplexes Business Logic).
 *
 * @module application/admin/event-handlers
 * @see ServerAccessTokenUsedEvent - Trigger Event
 * @see ServerAccessGuard - Emittiert das Event bei Token-Validierung
 */
@Injectable()
export class ServerAccessTokenUsedEventHandler {
  /**
   * In-Memory Map zur Speicherung des letzten Update-Zeitpunkts pro Token.
   *
   * Key: Token ID (String)
   * Value: Unix Timestamp des letzten Updates (ms)
   *
   * **Memory Considerations:**
   * - Map wächst mit Anzahl einzigartiger Tokens
   * - Bei sehr vielen Tokens könnte Memory-Cleanup nötig sein
   * - Für typische Deployments (< 1000 Tokens) ist das vernachlässigbar
   */
  private lastUpdateMap = new Map<string, number>();

  /**
   * Debounce-Intervall in Millisekunden.
   *
   * Token-Updates werden nur durchgeführt wenn seit dem letzten Update
   * mindestens DEBOUNCE_MS vergangen sind.
   */
  private readonly DEBOUNCE_MS = 60_000; // 1 Minute

  constructor(
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY)
    private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet ServerAccessTokenUsedEvent und aktualisiert lastUsedAt.
   *
   * Diese Methode wird asynchron (async: true) vom NestJS EventEmitter aufgerufen
   * wenn ein Token verwendet wird. Der Debounce-Mechanismus verhindert
   * übermäßige DB-Writes bei hoher API-Last.
   *
   * @param event - Das empfangene ServerAccessTokenUsedEvent
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   *
   * @example
   * ```typescript
   * // Event Flow:
   * // 1. ServerAccessGuard validiert Token
   * // 2. Guard emittiert ServerAccessTokenUsedEvent
   * // 3. Dieser Handler empfängt Event via @OnEvent
   * // 4. Handler prüft Debounce und aktualisiert lastUsedAt
   * ```
   */
  @OnEvent(EVENT_NAMES.SERVER_ACCESS_TOKEN.USED, { async: true })
  async handle(event: ServerAccessTokenUsedEvent): Promise<void> {
    const tokenId = event.tokenId.toString();
    const now = Date.now();
    const lastUpdate = this.lastUpdateMap.get(tokenId) ?? 0;

    // Debounce: Skip wenn kürzlich aktualisiert
    if (now - lastUpdate < this.DEBOUNCE_MS) {
      this.logger.debug('Skipping lastUsedAt update (debounced)', {
        tokenId,
        timeSinceLastUpdate: now - lastUpdate,
        debounceMs: this.DEBOUNCE_MS,
      });
      return;
    }

    // Debounce-Map aktualisieren BEVOR DB-Call
    // (verhindert Race Conditions bei parallelen Events)
    this.lastUpdateMap.set(tokenId, now);

    try {
      const result = await this.tokenRepository.updateLastUsed(event.tokenId, event.usedAt);

      if (result.isFailure) {
        this.logger.error('Failed to update token lastUsedAt', {
          tokenId,
          error: result.error,
        });
        return;
      }

      this.logger.debug('Updated token lastUsedAt', {
        tokenId,
        usedAt: event.usedAt.toISOString(),
      });
    } catch (error) {
      // Fire-and-Forget: Log but don't throw
      this.logger.error('Unexpected error updating token lastUsedAt', {
        tokenId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Gibt die aktuelle Größe der Debounce-Map zurück.
   *
   * Nur für Testing und Monitoring gedacht.
   *
   * @returns Anzahl der Einträge in der lastUpdateMap
   */
  getDebounceMapSize(): number {
    return this.lastUpdateMap.size;
  }

  /**
   * Leert die Debounce-Map.
   *
   * Nur für Testing gedacht. Ermöglicht das Zurücksetzen des Handler-States
   * zwischen Tests.
   */
  clearDebounceMap(): void {
    this.lastUpdateMap.clear();
  }
}
