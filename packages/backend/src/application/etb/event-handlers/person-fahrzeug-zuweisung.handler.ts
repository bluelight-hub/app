/**
 * ETB-Eintrag Auto-Creation bei Fahrzeug-Zuweisungen.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Fahrzeug-Zuweisung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Texte:**
 * - PersonZuFahrzeugZugewiesenEvent: "{Vorname} {Nachname} zu {Funkrufname} zugewiesen"
 * - PersonVonFahrzeugEntferntEvent: "{Vorname} {Nachname} von {Funkrufname} entfernt"
 *
 * @module application/etb/event-handlers
 * @see PersonZuFahrzeugZugewiesenEvent - Trigger Event (Domain Event via Outbox)
 * @see PersonVonFahrzeugEntferntEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PersonZuFahrzeugZugewiesenEvent } from '@domain/kraefte/events/person-zu-fahrzeug-zugewiesen.event';
import type { PersonVonFahrzeugEntferntEvent } from '@domain/kraefte/events/person-von-fahrzeug-entfernt.event';
import { Result } from '@domain/common/result';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';

/**
 * Retry-Konfiguration für Exponential Backoff.
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 100, // ms
  backoffFactor: 2,
} as const;

/**
 * Event Handler für automatische ETB-Einträge bei Fahrzeug-Zuweisungen.
 *
 * Verarbeitet PersonZuFahrzeugZugewiesenEvents und PersonVonFahrzeugEntferntEvents
 * und erstellt automatisch ETB-Einträge für die Dokumentation der Fahrzeug-Zuweisungen.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Fahrzeug-Zuweisung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 *
 * **Retry Logic (A2):**
 * - Transient failures (network, timeout) werden bis zu 3x wiederholt
 * - Exponential Backoff: 100ms, 200ms, 400ms
 * - Non-transient Fehler (validation) werden NICHT wiederholt
 * - Fire-and-Forget bleibt erhalten (Fehler werden nicht propagiert)
 *
 * **Event Flow (Transactional Outbox Pattern):**
 * 1. EinsatzPerson Command Handler weist Person zu Fahrzeug zu
 * 2. PersonZuFahrzeugZugewiesenEvent wird atomar in Outbox persistiert
 * 3. OutboxEventPublisher pollt und publiziert Event
 * 4. Infrastructure Adapter empfängt Event via @OnEvent
 * 5. Adapter delegiert an diesen Handler via IEventHandler.handle()
 *
 * **Memory Leak Prevention:**
 * Implementiert OnModuleDestroy um pending Retry-Timeouts bei Service-Shutdown
 * aufzuräumen. Nutzt AbortController für saubere Cancellation.
 */
@Injectable()
export class PersonFahrzeugZuweisungHandler implements IEventHandler<PersonZuFahrzeugZugewiesenEvent>, IEventHandler<PersonVonFahrzeugEntferntEvent>, OnModuleDestroy {
  /**
   * AbortController für Cleanup bei Module Destroy.
   * Signalisiert allen pending Retry-Operationen, dass sie abbrechen sollen.
   */
  private readonly abortController = new AbortController();

  /**
   * Set von pending Timeout-IDs für expliziten Cleanup.
   * Wird bei onModuleDestroy geleert um Memory Leaks zu vermeiden.
   */
  private readonly pendingTimeouts = new Set<NodeJS.Timeout>();

  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Cleanup bei Module Destroy.
   * Räumt alle pending Timeouts auf und signalisiert Abort.
   */
  onModuleDestroy(): void {
    this.logger.log(`Cleaning up ${this.pendingTimeouts.size} pending retry timeouts`, 'PersonFahrzeugZuweisungHandler');
    this.abortController.abort();

    for (const timeoutId of this.pendingTimeouts) {
      clearTimeout(timeoutId);
    }
    this.pendingTimeouts.clear();
  }

  /**
   * Helper: Führt eine Operation mit Retry Logic und Exponential Backoff aus.
   *
   * Transient failures (z.B. Netzwerk-Fehler, Timeouts) werden wiederholt.
   * Non-transient Fehler (z.B. Validierungs-Fehler) werden NICHT wiederholt.
   *
   * **Memory Leak Prevention:**
   * - Alle Timeouts werden in pendingTimeouts getrackt
   * - Bei onModuleDestroy werden alle pending Timeouts aufgeräumt
   * - AbortController signalisiert Abbruch bei Service-Shutdown
   *
   * @template T - Der Result-Typ der Operation
   * @param operation - Die auszuführende async Operation
   * @param context - Logging Context (z.B. "PersonZuFahrzeugZugewiesen")
   * @returns Promise<Result<T>> - Das Result der Operation (nach allen Retries)
   */
  private async executeWithRetry<T>(operation: () => Promise<Result<T>>, context: string): Promise<Result<T>> {
    let lastResult: Result<T> | undefined;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      // Prüfe ob Service shutdown signalisiert wurde
      if (this.abortController.signal.aborted) {
        this.logger.warn(`Retry aborted due to service shutdown: context=${context}, attempt=${attempt}`, 'PersonFahrzeugZuweisungHandler');
        return Result.fail<T>('Operation aborted due to service shutdown');
      }

      try {
        const result = await operation();

        // Erfolg: Sofort zurückgeben
        if (result.isSuccess) {
          if (attempt > 0) {
            this.logger.log(`Operation succeeded after ${attempt} retries: context=${context}`, 'PersonFahrzeugZuweisungHandler');
          }
          return result;
        }

        // Fehler: Prüfen ob retry sinnvoll ist
        lastResult = result;

        // Non-transient Fehler (Validation) NICHT wiederholen
        const isValidationError = result.error?.includes('validation') || result.error?.includes('invalid') || result.error?.includes('required') || result.error?.includes('must be');

        if (isValidationError) {
          this.logger.warn(`Non-transient error detected - skipping retry: context=${context}, error=${result.error}`, 'PersonFahrzeugZuweisungHandler');
          return result; // Sofort zurückgeben ohne Retry
        }

        // Transient Fehler: Retry wenn noch Versuche übrig
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = RETRY_CONFIG.baseDelay * RETRY_CONFIG.backoffFactor ** attempt;
          this.logger.warn(
            `Transient error - retrying (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}): context=${context}, error=${result.error}, delayMs=${delay}`,
            'PersonFahrzeugZuweisungHandler',
          );
          await this.sleepWithCleanup(delay);
        } else {
          this.logger.error(`Max retries exhausted: context=${context}, attempts=${attempt + 1}, error=${result.error}`, 'PersonFahrzeugZuweisungHandler');
        }
      } catch (error) {
        // Unerwarteter Exception: Als transient behandeln und retry
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Unexpected exception during operation (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}): context=${context}, error=${errorMessage}`, 'PersonFahrzeugZuweisungHandler');

        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = RETRY_CONFIG.baseDelay * RETRY_CONFIG.backoffFactor ** attempt;
          await this.sleepWithCleanup(delay);
        } else {
          // Max retries: Exception als Failed Result zurückgeben
          return Result.fail<T>(`Max retries exhausted after exception: ${errorMessage}`);
        }
      }
    }

    // Fallback: Sollte nicht erreichbar sein, aber TypeScript braucht einen Return
    return lastResult ?? Result.fail<T>('Unknown error during retry');
  }

  /**
   * Sleep mit automatischem Cleanup des Timeouts.
   *
   * Trackt den Timeout in pendingTimeouts und entfernt ihn nach Completion.
   * Ermöglicht sauberen Cleanup bei onModuleDestroy.
   *
   * @param ms - Millisekunden zu warten
   * @returns Promise<void> - Resolved nach delay oder rejected bei abort
   */
  private sleepWithCleanup(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Prüfe ob bereits aborted
      if (this.abortController.signal.aborted) {
        reject(new Error('Sleep aborted due to service shutdown'));
        return;
      }

      const timeoutId = setTimeout(() => {
        this.pendingTimeouts.delete(timeoutId);
        resolve();
      }, ms);

      // Tracke den Timeout für Cleanup
      this.pendingTimeouts.add(timeoutId);

      // Listener für abort - cleanup und reject
      const abortHandler = () => {
        clearTimeout(timeoutId);
        this.pendingTimeouts.delete(timeoutId);
        reject(new Error('Sleep aborted due to service shutdown'));
      };

      this.abortController.signal.addEventListener('abort', abortHandler, { once: true });
    });
  }

  /**
   * Verarbeitet PersonZuFahrzeugZugewiesenEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene PersonZuFahrzeugZugewiesenEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handleZugewiesen(event: PersonZuFahrzeugZugewiesenEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}`,
      'PersonFahrzeugZuweisungHandler',
    );

    try {
      // Validation: Namen sollten nicht leer sein (korrupte Event-Daten)
      if (!event.personVorname || !event.personNachname) {
        this.logger.warn(
          `PersonZuFahrzeugZugewiesenEvent has missing person name data - possible corrupted data: einsatzId=${event.einsatzId}, personId=${event.personId}, vorname=${event.personVorname}, nachname=${event.personNachname}`,
          'PersonFahrzeugZuweisungHandler',
        );
      }

      if (!event.fahrzeugFunkrufname) {
        this.logger.warn(
          `PersonZuFahrzeugZugewiesenEvent has missing fahrzeug funkrufname - possible corrupted data: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, funkrufname=${event.fahrzeugFunkrufname}`,
          'PersonFahrzeugZuweisungHandler',
        );
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = `${event.personVorname} ${event.personNachname} zu ${event.fahrzeugFunkrufname} zugewiesen`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, absender, empfaenger, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.zugewiesenVon,
        'MASSNAHME', // ETB Kategorie für Massnahmen/Aktionen
        event.einsatzId,
        undefined, // absender - nicht relevant für automatische Einträge
        undefined, // empfaenger - nicht relevant für automatische Einträge
        {
          eventType: 'PersonZuFahrzeugZugewiesen',
          personId: event.personId,
          fahrzeugId: event.fahrzeugId,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'PersonFahrzeugZuweisungHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler mit Retry Logic
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const command = commandResult.value!;

      const result = await this.executeWithRetry(() => this.addEintragHandler.execute(command), `PersonZuFahrzeugZugewiesen:${event.einsatzId}:${event.personId}:${event.fahrzeugId}`);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for PersonZuFahrzeugZugewiesen after retries: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'PersonFahrzeugZuweisungHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}`,
        'PersonFahrzeugZuweisungHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      // CRITICAL: Fire-and-Forget Fehler - erfordert manuelle Nachbearbeitung
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, zugewiesenVon=${event.zugewiesenVon}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'PersonFahrzeugZuweisungHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }

  /**
   * Verarbeitet PersonVonFahrzeugEntferntEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene PersonVonFahrzeugEntferntEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handleEntfernt(event: PersonVonFahrzeugEntferntEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}`,
      'PersonFahrzeugZuweisungHandler',
    );

    try {
      // Validation: Namen sollten nicht leer sein (korrupte Event-Daten)
      if (!event.personVorname || !event.personNachname) {
        this.logger.warn(
          `PersonVonFahrzeugEntferntEvent has missing person name data - possible corrupted data: einsatzId=${event.einsatzId}, personId=${event.personId}, vorname=${event.personVorname}, nachname=${event.personNachname}`,
          'PersonFahrzeugZuweisungHandler',
        );
      }

      if (!event.fahrzeugFunkrufname) {
        this.logger.warn(
          `PersonVonFahrzeugEntferntEvent has missing fahrzeug funkrufname - possible corrupted data: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, funkrufname=${event.fahrzeugFunkrufname}`,
          'PersonFahrzeugZuweisungHandler',
        );
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = `${event.personVorname} ${event.personNachname} von ${event.fahrzeugFunkrufname} entfernt`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, absender, empfaenger, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.entferntVon,
        'MASSNAHME', // ETB Kategorie für Massnahmen/Aktionen
        event.einsatzId,
        undefined, // absender - nicht relevant für automatische Einträge
        undefined, // empfaenger - nicht relevant für automatische Einträge
        {
          eventType: 'PersonVonFahrzeugEntfernt',
          personId: event.personId,
          fahrzeugId: event.fahrzeugId,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'PersonFahrzeugZuweisungHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler mit Retry Logic
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const command = commandResult.value!;

      const result = await this.executeWithRetry(() => this.addEintragHandler.execute(command), `PersonVonFahrzeugEntfernt:${event.einsatzId}:${event.personId}:${event.fahrzeugId}`);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for PersonVonFahrzeugEntfernt after retries: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'PersonFahrzeugZuweisungHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}`,
        'PersonFahrzeugZuweisungHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      // CRITICAL: Fire-and-Forget Fehler - erfordert manuelle Nachbearbeitung
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, entferntVon=${event.entferntVon}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'PersonFahrzeugZuweisungHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }

  /**
   * Generic handle method for IEventHandler interface compatibility.
   * This is required since the handler implements two different event types.
   * The infrastructure adapters will call handleZugewiesen() or handleEntfernt() directly.
   */
  async handle(event: PersonZuFahrzeugZugewiesenEvent | PersonVonFahrzeugEntferntEvent): Promise<void> {
    // Type guard to determine event type
    if ('zugewiesenVon' in event) {
      await this.handleZugewiesen(event as PersonZuFahrzeugZugewiesenEvent);
    } else if ('entferntVon' in event) {
      await this.handleEntfernt(event as PersonVonFahrzeugEntferntEvent);
    } else {
      this.logger.error('Unknown event type received in PersonFahrzeugZuweisungHandler.handle()', 'PersonFahrzeugZuweisungHandler');
    }
  }
}
