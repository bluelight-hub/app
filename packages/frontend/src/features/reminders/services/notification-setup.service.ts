/**
 * Notification Setup Service
 *
 * Initialisiert Notification-Channels und Action Types beim App-Start.
 * Registriert auch den onAction Handler für Deep Link Navigation.
 *
 * **Wichtig:** Muss einmalig beim App-Start aufgerufen werden (main.tsx)
 *
 * Features:
 * - Channel "erinnerungen" mit High Importance (Priorität 4)
 * - Action Type "erinnerung-action" für Klick-Handling
 * - Deep Link Navigation zur Erinnerung bei Notification-Klick
 */

import { isTauri } from '@tauri-apps/api/core';
import { z } from 'zod';
import { logger } from '@/shared/lib/logger';

/**
 * Schema fuer Runtime-Validierung der Notification extra Daten.
 *
 * Nutzt Zod discriminated union ueber das `type` Feld fuer robuste
 * Unterscheidung zwischen Erinnerung- und Befehl-Notifications.
 *
 * Zusaetzlich Fallback-Schemas ohne `type` fuer Rueckwaertskompatibilitaet
 * mit bestehenden Notifications die noch kein type-Feld haben.
 */
const typedErinnerungSchema = z.object({
  type: z.literal('erinnerung'),
  erinnerungId: z.string().min(1),
  einsatzId: z.string().min(1),
});

const typedBefehlSchema = z.object({
  type: z.literal('befehl'),
  befehlId: z.string().min(1),
  einsatzId: z.string().min(1),
});

/** Critical-Event Notification aus Story 1.2 (PSA, Vorfall o. ä.) */
const typedCriticalSchema = z.object({
  type: z.literal('critical'),
  eventId: z.string().min(1),
  url: z.string().min(1).optional(),
});

// Fallback-Schemas ohne type-Feld (Rueckwaertskompatibilitaet)
const legacyErinnerungSchema = z.object({
  erinnerungId: z.string().min(1),
  einsatzId: z.string().min(1),
});

const legacyBefehlSchema = z.object({
  befehlId: z.string().min(1),
  einsatzId: z.string().min(1),
});

// Typed Payloads nutzen `discriminatedUnion` auf `type` — robust gegen
// Feld-Kollisionen (z. B. ein legacy-Befehl-Payload mit versehentlichem
// `eventId`-Feld würde sonst als critical fehlklassifiziert).
const typedNotificationSchema = z.discriminatedUnion('type', [typedErinnerungSchema, typedBefehlSchema, typedCriticalSchema]);

const notificationExtraSchema = z.union([typedNotificationSchema, legacyBefehlSchema, legacyErinnerungSchema]);

/** Channel ID für Erinnerungen */
export const ERINNERUNG_CHANNEL_ID = 'erinnerungen';

/** Action Type ID für Erinnerung-Notifications */
export const ERINNERUNG_ACTION_TYPE_ID = 'erinnerung-action';

/** Action ID für "Öffnen" Button */
export const ERINNERUNG_ACTION_OPEN_ID = 'open-erinnerung';

/** Channel ID für Befehle */
export const BEFEHL_CHANNEL_ID = 'befehle';

/** Action Type ID für Befehl-Notifications */
export const BEFEHL_ACTION_TYPE_ID = 'befehl-action';

/** Action ID für "Öffnen" Button bei Befehlen */
export const BEFEHL_ACTION_OPEN_ID = 'open-befehl';

/** Channel ID für kritische Plattform-Events (Story 1.2) */
export const CRITICAL_CHANNEL_ID = 'critical-events';

/** Action Type ID für kritische Benachrichtigungen */
export const CRITICAL_ACTION_TYPE_ID = 'critical-action';

/** Action ID für "Öffnen" Button bei kritischen Benachrichtigungen */
export const CRITICAL_ACTION_OPEN_ID = 'open-critical';

/**
 * Callback-Typ für Navigation bei Erinnerung-Notification-Klick
 */
export type NavigateToErinnerungCallback = (einsatzId: string, erinnerungId: string) => void;

/**
 * Callback-Typ für Navigation bei Befehl-Notification-Klick
 */
export type NavigateToBefehlCallback = (einsatzId: string, befehlId: string) => void;

/**
 * Callback-Typ für Navigation bei kritischer Notification (Story 1.2)
 *
 * `url` kann leer sein — dann soll der Callback nur das Fenster fokussieren.
 */
export type NavigateToCriticalCallback = (url: string | undefined, eventId: string) => void;

/**
 * Pending Navigation Eintrag für Erinnerungen
 *
 * Speichert Navigationsanfragen die vor Callback-Registrierung eintrafen.
 */
interface PendingNavigation {
  einsatzId: string;
  erinnerungId: string;
}

/**
 * Pending Navigation Eintrag für Befehle
 */
interface PendingBefehlNavigation {
  einsatzId: string;
  befehlId: string;
}

/**
 * Pending Navigation Eintrag für kritische Events (Story 1.2)
 */
interface PendingCriticalNavigation {
  url: string | undefined;
  eventId: string;
}

/**
 * Notification Setup Service
 *
 * Singleton für einmalige Initialisierung beim App-Start.
 *
 * **Race Condition Handling:**
 * Wenn eine Notification bei App-Start eintrifft bevor der navigateCallback
 * registriert wurde, wird die Navigation in einer Queue gespeichert und
 * automatisch verarbeitet sobald setNavigateCallback() aufgerufen wird.
 */
/**
 * Max Einträge in den pending-Navigation-Queues — verhindert unbegrenzten
 * Memory-Aufbau, wenn ein Callback nie registriert wird. Bei Überlauf werden
 * die ältesten Einträge verdrängt (FIFO), nicht die neusten.
 */
const MAX_PENDING_NAVIGATIONS = 20;

class NotificationSetupService {
  private isInitialized = false;
  private navigateCallback: NavigateToErinnerungCallback | null = null;
  private navigateBefehlCallback: NavigateToBefehlCallback | null = null;
  private navigateCriticalCallback: NavigateToCriticalCallback | null = null;
  private actionListenerUnsubscribe: (() => void) | null = null;
  private pendingNavigations: PendingNavigation[] = [];
  private pendingBefehlNavigations: PendingBefehlNavigation[] = [];
  private pendingCriticalNavigations: PendingCriticalNavigation[] = [];

  /**
   * Fügt einem Queue-Array einen Eintrag hinzu und verdrängt älteste Einträge
   * beim Überschreiten von `MAX_PENDING_NAVIGATIONS`.
   */
  private enqueuePending<T>(queue: T[], entry: T): void {
    queue.push(entry);
    while (queue.length > MAX_PENDING_NAVIGATIONS) {
      queue.shift();
    }
  }

  /**
   * Initialisiert Notification Channels und Action Types
   *
   * Sollte beim App-Start aufgerufen werden (main.tsx).
   * Ist idempotent - mehrfache Aufrufe sind sicher.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('[NotificationSetup] Already initialized, skipping...');
      return;
    }

    if (!isTauri()) {
      logger.debug('[NotificationSetup] Not in Tauri environment, skipping...');
      this.isInitialized = true;
      return;
    }

    try {
      // Cleanup vor neuer Registrierung um Memory Leaks zu vermeiden
      this.cleanup();

      await this.createErinnerungChannel();
      await this.createBefehlChannel();
      await this.createCriticalChannel();
      await this.registerActionTypes();
      await this.registerActionHandler();

      this.isInitialized = true;
      logger.info('[NotificationSetup] Initialized successfully');
    } catch (error) {
      logger.error('[NotificationSetup] Initialization failed:', error);
      // Nicht re-thrown - App soll trotzdem funktionieren
    }
  }

  /**
   * Entfernt registrierte Listener um Memory Leaks zu vermeiden
   *
   * Wird automatisch vor Re-Initialisierung aufgerufen.
   * Kann auch manuell beim App-Shutdown aufgerufen werden.
   */
  cleanup(): void {
    if (this.actionListenerUnsubscribe) {
      this.actionListenerUnsubscribe();
      this.actionListenerUnsubscribe = null;
      logger.debug('[NotificationSetup] Action listener cleaned up');
    }
  }

  /**
   * Registriert Callback für Navigation bei Notification-Klick
   *
   * Verarbeitet automatisch alle pending Navigationen die vor der
   * Callback-Registrierung eingetroffen sind (Race Condition Fix).
   *
   * @param callback - Wird aufgerufen mit (einsatzId, erinnerungId)
   */
  setNavigateCallback(callback: NavigateToErinnerungCallback): void {
    this.navigateCallback = callback;

    // Verarbeite alle pending Navigationen die vor Callback-Registrierung eintrafen
    if (this.pendingNavigations.length > 0) {
      logger.info(`[NotificationSetup] Processing ${this.pendingNavigations.length} pending navigation(s)`);

      // Queue zuerst leeren, dann abarbeiten — so verlieren spätere Callback-Throws
      // nicht die restlichen Einträge, und ein erneuter Flush ist idempotent.
      const batch = this.pendingNavigations;
      this.pendingNavigations = [];
      for (const pending of batch) {
        logger.info('[NotificationSetup] Executing pending navigation:', pending);
        try {
          callback(pending.einsatzId, pending.erinnerungId);
        } catch (error) {
          logger.error('[NotificationSetup] Pending erinnerung callback threw', { error, pending });
        }
      }
    }
  }

  /**
   * Registriert Callback für Navigation bei Befehl-Notification-Klick
   *
   * Verarbeitet automatisch alle pending Befehl-Navigationen die vor der
   * Callback-Registrierung eingetroffen sind (Race Condition Fix).
   *
   * @param callback - Wird aufgerufen mit (einsatzId, befehlId)
   */
  setNavigateBefehlCallback(callback: NavigateToBefehlCallback): void {
    this.navigateBefehlCallback = callback;

    // Verarbeite alle pending Befehl-Navigationen
    if (this.pendingBefehlNavigations.length > 0) {
      logger.info(`[NotificationSetup] Processing ${this.pendingBefehlNavigations.length} pending befehl navigation(s)`);

      const batch = this.pendingBefehlNavigations;
      this.pendingBefehlNavigations = [];
      for (const pending of batch) {
        logger.info('[NotificationSetup] Executing pending befehl navigation:', pending);
        try {
          callback(pending.einsatzId, pending.befehlId);
        } catch (error) {
          logger.error('[NotificationSetup] Pending befehl callback threw', { error, pending });
        }
      }
    }
  }

  /**
   * Registriert Callback für Navigation bei kritischer Notification (Story 1.2)
   *
   * Verarbeitet gequeuete Navigationen analog zu Erinnerung/Befehl.
   */
  setNavigateCriticalCallback(callback: NavigateToCriticalCallback): void {
    this.navigateCriticalCallback = callback;

    if (this.pendingCriticalNavigations.length > 0) {
      logger.info(`[NotificationSetup] Processing ${this.pendingCriticalNavigations.length} pending critical navigation(s)`);

      const batch = this.pendingCriticalNavigations;
      this.pendingCriticalNavigations = [];
      for (const pending of batch) {
        logger.info('[NotificationSetup] Executing pending critical navigation:', pending);
        try {
          callback(pending.url, pending.eventId);
        } catch (error) {
          logger.error('[NotificationSetup] Pending critical callback threw', { error, pending });
        }
      }
    }
  }

  /**
   * Erstellt Notification Channel mit High Importance
   *
   * Android/Desktop: Notifications werden prominent angezeigt
   *
   * **Hinweis:** `channels()` ist nur in Tauri Desktop verfügbar, nicht im Browser.
   * Daher wird createChannel direkt aufgerufen - bei bereits existierendem
   * Channel wird der Fehler ignoriert.
   */
  private async createErinnerungChannel(): Promise<void> {
    try {
      const { createChannel, Importance, Visibility } = await import('@tauri-apps/plugin-notification');

      // Direkt Channel erstellen - Fehler bei Duplikat wird abgefangen
      // (channels() API ist nicht überall verfügbar, z.B. nicht auf macOS)
      await createChannel({
        id: ERINNERUNG_CHANNEL_ID,
        name: 'Erinnerungen',
        description: 'Benachrichtigungen für fällige Erinnerungen',
        importance: Importance.High,
        visibility: Visibility.Public,
        vibration: true,
        lights: true,
      });

      logger.info('[NotificationSetup] Channel created with High Importance');
    } catch (error) {
      // Channel existiert bereits oder API nicht verfügbar - beides OK
      // "not found" bedeutet das Command existiert nicht auf dieser Plattform (z.B. macOS)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists') || errorMessage.includes('not allowed') || errorMessage.includes('not found')) {
        logger.debug('[NotificationSetup] Channel API not available on this platform (expected on macOS)');
        return;
      }
      logger.error('[NotificationSetup] Failed to create channel:', error);
      throw error;
    }
  }

  /**
   * Erstellt Befehl Notification Channel mit High Importance
   *
   * Analog zum Erinnerung-Channel, aber für Befehl-Notifications.
   */
  private async createBefehlChannel(): Promise<void> {
    try {
      const { createChannel, Importance, Visibility } = await import('@tauri-apps/plugin-notification');

      await createChannel({
        id: BEFEHL_CHANNEL_ID,
        name: 'Befehle',
        description: 'Benachrichtigungen für neue Befehle',
        importance: Importance.High,
        visibility: Visibility.Public,
        vibration: true,
        lights: true,
      });

      logger.info('[NotificationSetup] Befehl channel created with High Importance');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists') || errorMessage.includes('not allowed') || errorMessage.includes('not found')) {
        logger.debug('[NotificationSetup] Befehl channel API not available on this platform (expected on macOS)');
        return;
      }
      logger.error('[NotificationSetup] Failed to create befehl channel:', error);
      throw error;
    }
  }

  /**
   * Erstellt Critical-Events Notification Channel mit High Importance (Story 1.2).
   *
   * Analog zu Erinnerung-/Befehl-Channel, für plattformweite kritische Events
   * (PSA-Hochstufung, Vorfall-Meldung).
   */
  private async createCriticalChannel(): Promise<void> {
    try {
      const { createChannel, Importance, Visibility } = await import('@tauri-apps/plugin-notification');

      await createChannel({
        id: CRITICAL_CHANNEL_ID,
        name: 'Kritische Ereignisse',
        description: 'Kritische Plattform-Events (z. B. PSA-Hochstufung, Vorfall-Meldung)',
        importance: Importance.High,
        visibility: Visibility.Public,
        vibration: true,
        lights: true,
      });

      logger.info('[NotificationSetup] Critical channel created with High Importance');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists') || errorMessage.includes('not allowed') || errorMessage.includes('not found')) {
        logger.debug('[NotificationSetup] Critical channel API not available on this platform (expected on macOS)');
        return;
      }
      logger.error('[NotificationSetup] Failed to create critical channel:', error);
      throw error;
    }
  }

  /**
   * Registriert Action Types für Notification-Buttons
   *
   * **Hinweis:** Nicht auf allen Plattformen verfügbar (z.B. nicht auf macOS).
   */
  private async registerActionTypes(): Promise<void> {
    try {
      const { registerActionTypes } = await import('@tauri-apps/plugin-notification');

      await registerActionTypes([
        {
          id: ERINNERUNG_ACTION_TYPE_ID,
          actions: [
            {
              id: ERINNERUNG_ACTION_OPEN_ID,
              title: 'Öffnen',
              foreground: true, // App in Vordergrund bringen
            },
          ],
        },
        {
          id: BEFEHL_ACTION_TYPE_ID,
          actions: [
            {
              id: BEFEHL_ACTION_OPEN_ID,
              title: 'Öffnen',
              foreground: true,
            },
          ],
        },
        {
          id: CRITICAL_ACTION_TYPE_ID,
          actions: [
            {
              id: CRITICAL_ACTION_OPEN_ID,
              title: 'Öffnen',
              foreground: true,
            },
          ],
        },
      ]);

      logger.info('[NotificationSetup] Action types registered');
    } catch (error) {
      // API nicht auf allen Plattformen verfügbar (z.B. macOS)
      // "not found" bedeutet das Command existiert nicht auf dieser Plattform
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not allowed') || errorMessage.includes('not supported') || errorMessage.includes('not found')) {
        logger.debug('[NotificationSetup] Action types API not available on this platform');
        return;
      }
      logger.error('[NotificationSetup] Failed to register action types:', error);
      throw error;
    }
  }

  /**
   * Registriert Handler für Notification-Klicks
   *
   * Wird aufgerufen wenn User auf Notification oder Action-Button klickt.
   * Nutzt Zod safeParse() für sichere Runtime-Validierung der extra Daten.
   *
   * **Hinweis:** Nicht auf allen Plattformen verfügbar (z.B. nicht auf macOS).
   */
  private async registerActionHandler(): Promise<void> {
    try {
      const { onAction } = await import('@tauri-apps/plugin-notification');

      // Speichere Unsubscribe-Funktion um Memory Leaks zu vermeiden
      this.actionListenerUnsubscribe = await onAction((notification) => {
        logger.info('[NotificationSetup] Action received:', notification);

        // Runtime-Validierung der extra Daten mit Zod (Security: keine unsichere Type-Assertion)
        const parseResult = notificationExtraSchema.safeParse(notification.extra);

        if (!parseResult.success) {
          logger.warn('[NotificationSetup] Invalid notification extra data:', parseResult.error);
          return;
        }

        const data = parseResult.data;

        // Typed Payloads (mit `type`-Feld) werden via discriminatedUnion sicher
        // unterschieden; legacy Payloads (ohne `type`) fallen auf strukturelle
        // Checks zurück. Das verhindert Fehlklassifikation bei zufällig
        // kollidierenden Feldnamen.
        if ('type' in data) {
          switch (data.type) {
            case 'critical': {
              const { url, eventId } = data;
              if (this.navigateCriticalCallback) {
                logger.info('[NotificationSetup] Navigating for critical event:', { url, eventId });
                this.navigateCriticalCallback(url, eventId);
              } else {
                logger.info('[NotificationSetup] Critical callback not ready, queueing navigation:', { url, eventId });
                this.enqueuePending(this.pendingCriticalNavigations, { url, eventId });
              }
              return;
            }
            case 'befehl': {
              const { einsatzId, befehlId } = data;
              if (this.navigateBefehlCallback) {
                logger.info('[NotificationSetup] Navigating to befehl:', { einsatzId, befehlId });
                this.navigateBefehlCallback(einsatzId, befehlId);
              } else {
                logger.info('[NotificationSetup] Befehl callback not ready, queueing navigation:', { einsatzId, befehlId });
                this.enqueuePending(this.pendingBefehlNavigations, { einsatzId, befehlId });
              }
              return;
            }
            case 'erinnerung': {
              const { einsatzId, erinnerungId } = data;
              if (this.navigateCallback) {
                logger.info('[NotificationSetup] Navigating to erinnerung:', { einsatzId, erinnerungId });
                this.navigateCallback(einsatzId, erinnerungId);
              } else {
                logger.info('[NotificationSetup] Callback not ready, queueing navigation:', { einsatzId, erinnerungId });
                this.enqueuePending(this.pendingNavigations, { einsatzId, erinnerungId });
              }
              return;
            }
          }
        }

        // Legacy Payloads ohne `type`-Feld.
        if ('befehlId' in data) {
          const { einsatzId, befehlId } = data;
          if (this.navigateBefehlCallback) {
            logger.info('[NotificationSetup] Navigating to befehl (legacy):', { einsatzId, befehlId });
            this.navigateBefehlCallback(einsatzId, befehlId);
          } else {
            logger.info('[NotificationSetup] Befehl callback not ready, queueing navigation (legacy):', { einsatzId, befehlId });
            this.enqueuePending(this.pendingBefehlNavigations, { einsatzId, befehlId });
          }
        } else {
          const { einsatzId, erinnerungId } = data;
          if (this.navigateCallback) {
            logger.info('[NotificationSetup] Navigating to erinnerung (legacy):', { einsatzId, erinnerungId });
            this.navigateCallback(einsatzId, erinnerungId);
          } else {
            logger.info('[NotificationSetup] Callback not ready, queueing navigation (legacy):', { einsatzId, erinnerungId });
            this.enqueuePending(this.pendingNavigations, { einsatzId, erinnerungId });
          }
        }
      });

      logger.info('[NotificationSetup] Action handler registered');
    } catch (error) {
      // API nicht auf allen Plattformen verfügbar (z.B. macOS)
      // "not found" bedeutet das Command existiert nicht auf dieser Plattform
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not allowed') || errorMessage.includes('not supported') || errorMessage.includes('not found')) {
        logger.debug('[NotificationSetup] Action handler API not available on this platform');
        return;
      }
      logger.error('[NotificationSetup] Failed to register action handler:', error);
      throw error;
    }
  }
}

// Singleton-Instanz
export const notificationSetupService = new NotificationSetupService();

// Named Exports für einfachere Verwendung
export const initializeNotificationSetup = () => notificationSetupService.initialize();
export const setNotificationNavigateCallback = (callback: NavigateToErinnerungCallback) => notificationSetupService.setNavigateCallback(callback);
export const setNotificationNavigateBefehlCallback = (callback: NavigateToBefehlCallback) => notificationSetupService.setNavigateBefehlCallback(callback);
export const setNotificationNavigateCriticalCallback = (callback: NavigateToCriticalCallback) => notificationSetupService.setNavigateCriticalCallback(callback);
export const cleanupNotificationSetup = () => notificationSetupService.cleanup();
