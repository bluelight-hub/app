import { logger } from '@/shared/lib/logger';
import { isTauri } from '@tauri-apps/api/core';

/**
 * Notification Permission Status
 *
 * Beschreibt den aktuellen Status der Benachrichtigungsberechtigung.
 */
export type NotificationPermissionStatus = 'granted' | 'denied' | 'unknown' | 'not-supported';

/**
 * Optionen für das Senden einer kritischen Plattform-Notification (Story 1.2).
 *
 * Wird von `useCriticalNotification` aufgerufen, wenn Foreground-Events
 * außerhalb des Service-Workers (z. B. via WebSocket) eintreffen.
 */
export interface CriticalNotificationOptions {
  /** Notification-Titel (nicht leer) */
  title: string;
  /** Notification-Body */
  body: string;
  /** Eindeutige Event-ID — Pflicht für Dedup/Tag-Semantik */
  eventId: string;
  /** Optionaler Deep-Link für Notification-Click */
  url?: string;
}

/**
 * Optionen für das Senden einer Befehl-Benachrichtigung
 */
export interface BefehlNotificationOptions {
  /** Befehl-ID für Deep Link Navigation */
  befehlId: string;
  /** Einsatz-ID für Deep Link Navigation */
  einsatzId: string;
  /** Befehlsnummer (z.B. "B2026-abc123") */
  nummer: string;
  /** Name oder ID des Befehlsgebers */
  befehlsgeber: string;
  /** Befehlsinhalt (wird auf 100 Zeichen gekürzt) */
  inhalt: string;
}

/**
 * Optionen für das Senden einer Benachrichtigung
 */
export interface SendNotificationOptions {
  /** Titel der Benachrichtigung */
  title: string;
  /** Optionaler Body-Text (Standard: 'Jetzt fällig') */
  body?: string;
  /** Optionales Icon für Web Notifications */
  icon?: string;
  /** Erinnerung-ID für Deep Link Navigation */
  erinnerungId?: string;
  /** Einsatz-ID für Deep Link Navigation */
  einsatzId?: string;
}

/**
 * Ergebnis einer Notification-Operation
 */
export interface NotificationResult {
  /** Ob die Operation erfolgreich war */
  success: boolean;
  /** Fehlermeldung falls nicht erfolgreich */
  error?: string;
}

/**
 * Notification Service für Erinnerungen
 *
 * Ermöglicht das Senden von nativen OS-Benachrichtigungen mit automatischem
 * Fallback auf Web Notifications falls Tauri nicht verfügbar ist.
 *
 * Features:
 * - Tauri 2.x Native Notifications (funktioniert auch bei minimierter App)
 * - Web Notification API Fallback für Browser-Testing
 * - Permission-Request Handling
 * - Graceful Degradation bei fehlenden Permissions
 *
 * ## Setup (Tauri Native Notifications)
 *
 * 1. Frontend: `pnpm add @tauri-apps/plugin-notification`
 * 2. Rust (Cargo.toml): `tauri-plugin-notification = "2"`
 * 3. Capability (default.json): `"notification:default"`
 * 4. Rust (lib.rs): `.plugin(tauri_plugin_notification::init())`
 *
 * Ohne diese Konfiguration wird automatisch auf Web Notifications zurückgefallen.
 *
 * @example
 * ```typescript
 * // Permission anfordern
 * const status = await notificationService.requestPermission();
 * if (status === 'granted') {
 *   await notificationService.send({ title: 'Erinnerung: Meeting' });
 * }
 * ```
 */
class NotificationService {
  private permissionStatus: NotificationPermissionStatus = 'unknown';

  /** Cache ob Tauri Plugin funktionsfähig ist (null = nicht geprüft) */
  private tauriPluginAvailable: boolean | null = null;

  /**
   * Prüft ob Benachrichtigungen grundsätzlich unterstützt werden
   *
   * @returns true wenn Tauri Notification Plugin oder Web Notifications verfügbar
   */
  async isSupported(): Promise<boolean> {
    if (isTauri() && (await this.isTauriPluginAvailable())) {
      return true;
    }

    // Web: Prüfe Notification API
    return 'Notification' in window;
  }

  /**
   * Prüft den aktuellen Permission-Status
   *
   * Fragt bei Tauri die native Permission ab, im Browser die Web Notification Permission.
   *
   * @returns Aktueller Permission-Status
   */
  async checkPermission(): Promise<NotificationPermissionStatus> {
    if (!(await this.isSupported())) {
      this.permissionStatus = 'not-supported';
      return this.permissionStatus;
    }

    // Nutze Tauri nur wenn Plugin wirklich verfügbar
    if (isTauri() && this.tauriPluginAvailable) {
      return this.checkTauriPermission();
    }

    return this.checkWebPermission();
  }

  /**
   * Fordert die Notification-Berechtigung an
   *
   * Zeigt bei Bedarf einen System-Dialog zur Berechtigungsanfrage.
   * Bei bereits erteilter Berechtigung wird 'granted' zurückgegeben.
   *
   * @returns Promise mit dem neuen Permission-Status
   */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!(await this.isSupported())) {
      logger.warn('Benachrichtigungen werden nicht unterstützt');
      this.permissionStatus = 'not-supported';
      return this.permissionStatus;
    }

    // Nutze Tauri nur wenn Plugin wirklich verfügbar
    if (isTauri() && this.tauriPluginAvailable) {
      return this.requestTauriPermission();
    }

    return this.requestWebPermission();
  }

  /**
   * Sendet eine native Benachrichtigung
   *
   * Nutzt Tauri Native Notifications wenn verfügbar, sonst Web Notification API.
   * Die Benachrichtigung erscheint auch wenn die App minimiert oder im Hintergrund ist.
   *
   * @param options - Notification-Optionen (title, body)
   * @returns Promise mit Erfolgs-Status
   *
   * @example
   * ```typescript
   * await notificationService.send({
   *   title: 'Erinnerung: Funkgerät prüfen',
   *   body: 'Jetzt fällig'
   * });
   * ```
   */
  async send(options: SendNotificationOptions): Promise<NotificationResult> {
    const { title, body = 'Jetzt fällig' } = options;

    // Prüfe Permission falls noch nicht bekannt
    if (this.permissionStatus === 'unknown') {
      await this.checkPermission();
    }

    // Keine Permission - graceful degradation
    if (this.permissionStatus !== 'granted') {
      logger.warn('Keine Berechtigung für Benachrichtigungen', {
        status: this.permissionStatus,
        title,
      });
      return {
        success: false,
        error: `Keine Berechtigung: ${this.permissionStatus}`,
      };
    }

    // Nutze Tauri nur wenn Plugin wirklich verfügbar
    if (isTauri() && this.tauriPluginAvailable) {
      return this.sendTauriNotification(title, body, options.erinnerungId, options.einsatzId);
    }

    return this.sendWebNotification(title, body, options.icon);
  }

  /**
   * Sendet eine Erinnerungs-Benachrichtigung mit Standard-Format
   *
   * Convenience-Methode für Erinnerungen mit konsistentem Format.
   * Nutzt High Importance Channel und Deep Link Action für Navigation.
   *
   * @param erinnerungTitle - Titel der Erinnerung
   * @param erinnerungId - ID der Erinnerung für Deep Link
   * @param einsatzId - ID des Einsatzes für Deep Link
   * @returns Promise mit Erfolgs-Status
   */
  async sendErinnerungNotification(erinnerungTitle: string, erinnerungId?: string, einsatzId?: string): Promise<NotificationResult> {
    return this.send({
      title: `Erinnerung: ${erinnerungTitle}`,
      body: 'Jetzt fällig',
      erinnerungId,
      einsatzId,
    });
  }

  /**
   * Sendet eine intensivierte Re-Notification (Story 2.3 AC3)
   *
   * Wird aufgerufen wenn 30 Sekunden ohne Reaktion vergangen sind.
   * Zeigt eine dringlichere Benachrichtigung mit "Überfällig - Bitte reagieren!" Body.
   *
   * @param erinnerungTitle - Titel der Erinnerung
   * @param erinnerungId - ID der Erinnerung für Deep Link
   * @param einsatzId - ID des Einsatzes für Deep Link
   * @returns Promise mit Erfolgs-Status
   *
   * @example
   * ```typescript
   * // Bei Intensivierung nach 30s
   * await notificationService.sendIntensifiedNotification(
   *   'Funkgerät prüfen',
   *   'erinnerung-123',
   *   'einsatz-456'
   * );
   * ```
   */
  async sendIntensifiedNotification(erinnerungTitle: string, erinnerungId?: string, einsatzId?: string): Promise<NotificationResult> {
    return this.send({
      title: `⚠️ Erinnerung: ${erinnerungTitle}`,
      body: 'Überfällig - Bitte reagieren!',
      erinnerungId,
      einsatzId,
    });
  }

  /**
   * Sendet eine Zuweisungs-Benachrichtigung (Story 3.7 AC1)
   *
   * Wird aufgerufen wenn dem aktuellen User eine Erinnerung zugewiesen wird.
   * Zeigt "Neue Erinnerung von [ErstellerName]" als Titel.
   * Klick auf Notification fokussiert die App und navigiert zur Erinnerung.
   *
   * @param erinnerungTitle - Titel der zugewiesenen Erinnerung
   * @param assignedByName - Name des Users der die Erinnerung zugewiesen hat
   * @param erinnerungId - ID der Erinnerung fuer Deep Link
   * @param einsatzId - ID des Einsatzes fuer Deep Link
   * @returns Promise mit Erfolgs-Status
   *
   * @example
   * ```typescript
   * // Bei Assignment via WebSocket
   * await notificationService.sendAssignmentNotification(
   *   'Funkgeraet pruefen',
   *   'Max Mustermann',
   *   'erinnerung-123',
   *   'einsatz-456'
   * );
   * ```
   */
  async sendAssignmentNotification(erinnerungTitle: string, assignedByName: string, erinnerungId?: string, einsatzId?: string): Promise<NotificationResult> {
    return this.send({
      title: `Neue Erinnerung von ${assignedByName}`,
      body: erinnerungTitle,
      erinnerungId,
      einsatzId,
    });
  }

  /**
   * Sendet eine kritische Plattform-Notification (Story 1.2).
   *
   * Wird aus `useCriticalNotification` aufgerufen, wenn ein Critical-Event im
   * Foreground eintrifft (z. B. via WebSocket). Nutzt den dedizierten
   * Critical-Channel (High Importance, Heads-up).
   */
  async sendCriticalNotification(options: CriticalNotificationOptions): Promise<NotificationResult> {
    const { title, body, eventId, url } = options;

    // Gecachter Status kann zur Laufzeit veralten, wenn der User OS-seitig die
    // Permission verändert hat. Wir re-checken bei jedem nicht-granted-Cache,
    // nicht nur bei 'unknown'.
    if (this.permissionStatus !== 'granted') {
      await this.checkPermission();
    }

    if (this.permissionStatus !== 'granted') {
      logger.warn('Keine Berechtigung für kritische Benachrichtigungen', { status: this.permissionStatus, title });
      return { success: false, error: `Keine Berechtigung: ${this.permissionStatus}` };
    }

    if (isTauri() && this.tauriPluginAvailable) {
      return this.sendTauriCriticalNotification(title, body, eventId, url);
    }

    return this.sendWebCriticalNotification(title, body, eventId, url);
  }

  /**
   * Sendet eine Befehl-Benachrichtigung
   *
   * Wird aufgerufen wenn ein neuer Befehl via WebSocket empfangen wird.
   * Nutzt eigenen Channel und Action Type für Befehl-Deep-Links.
   *
   * @param options - Befehl-Notification-Optionen
   * @returns Promise mit Erfolgs-Status
   */
  async sendBefehlNotification(options: BefehlNotificationOptions): Promise<NotificationResult> {
    const { nummer, befehlsgeber, inhalt, befehlId, einsatzId } = options;

    const title = `Neuer Befehl #${nummer}`;
    const body = `Von ${befehlsgeber}: ${inhalt.substring(0, 100)}`;

    // Prüfe Permission falls noch nicht bekannt
    if (this.permissionStatus === 'unknown') {
      await this.checkPermission();
    }

    if (this.permissionStatus !== 'granted') {
      logger.warn('Keine Berechtigung für Benachrichtigungen', { status: this.permissionStatus, title });
      return { success: false, error: `Keine Berechtigung: ${this.permissionStatus}` };
    }

    // Nutze Tauri nur wenn Plugin wirklich verfügbar
    if (isTauri() && this.tauriPluginAvailable) {
      return this.sendTauriBefehlNotification(title, body, befehlId, einsatzId);
    }

    return this.sendWebBefehlNotification(title, body, befehlId, einsatzId);
  }

  /**
   * Navigiert lazy zur Befehlsansicht.
   *
   * Vermeidet statischen Import von `@/main`, damit Tests ohne App-Bootstrap laufen.
   */
  private navigateToBefehl(einsatzId: string, befehlId: string): void {
    void import('@/main')
      .then(({ router }) => {
        router.navigate({
          to: '/app/einsatz/$einsatzId/führung/befehle',
          params: { einsatzId },
          search: { befehlId },
        });
      })
      .catch((error) => {
        logger.warn('Navigation über Router fehlgeschlagen, fallback auf URL', { error });
        if (typeof window !== 'undefined') {
          window.location.href = `/app/einsatz/${einsatzId}/führung/befehle?befehlId=${befehlId}`;
        }
      });
  }

  /**
   * Prüft ob das Tauri Notification Plugin verfügbar ist
   *
   * Prüft nur ob das JS-Modul importierbar ist und die erwarteten Exports hat.
   * Kein IPC-Call um Mixed-Content-Fehler (https:// → ipc://) zu vermeiden.
   * Die tatsaechliche Plugin-Verfuegbarkeit wird beim ersten Aufruf verifiziert.
   */
  private async isTauriPluginAvailable(): Promise<boolean> {
    // Cached Ergebnis nutzen
    if (this.tauriPluginAvailable !== null) {
      return this.tauriPluginAvailable;
    }

    try {
      const mod = await import('@tauri-apps/plugin-notification');
      // Modul importierbar und erwartete Exports vorhanden → optimistisch verfügbar
      // Kein IPC-Probe-Call: Mixed-Content-Block (https→ipc) loest Browser-Fehler aus
      // bevor unser catch greift. Tatsächliche Verfügbarkeit wird bei erstem Aufruf geprüft.
      this.tauriPluginAvailable = typeof mod.isPermissionGranted === 'function';
      return this.tauriPluginAvailable;
    } catch {
      logger.warn('Tauri Notification Plugin nicht verfügbar, nutze Web Notifications als Fallback');
      this.tauriPluginAvailable = false;
      return false;
    }
  }

  // ===================
  // Tauri Implementation
  // ===================

  /**
   * Prüft Tauri Native Permission
   */
  private async checkTauriPermission(): Promise<NotificationPermissionStatus> {
    try {
      const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
      const granted = await isPermissionGranted();

      this.permissionStatus = granted ? 'granted' : 'unknown';
      logger.debug('Tauri Notification Permission:', this.permissionStatus);

      return this.permissionStatus;
    } catch (error) {
      logger.error('Fehler beim Prüfen der Tauri Notification Permission:', error);
      // Plugin funktioniert nicht → Fallback auf Web Notifications
      this.tauriPluginAvailable = false;
      this.permissionStatus = 'not-supported';
      return this.permissionStatus;
    }
  }

  /**
   * Fordert Tauri Native Permission an
   */
  private async requestTauriPermission(): Promise<NotificationPermissionStatus> {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');

      // Erst prüfen ob schon granted
      let granted = await isPermissionGranted();

      if (!granted) {
        // Permission anfordern
        const result = await requestPermission();
        granted = result === 'granted';
      }

      this.permissionStatus = granted ? 'granted' : 'denied';
      logger.info('Tauri Notification Permission angefordert:', this.permissionStatus);

      return this.permissionStatus;
    } catch (error) {
      logger.error('Fehler beim Anfordern der Tauri Notification Permission:', error);
      // Plugin funktioniert nicht → Fallback auf Web Notifications
      this.tauriPluginAvailable = false;
      this.permissionStatus = 'not-supported';
      return this.permissionStatus;
    }
  }

  /**
   * Sendet Tauri Native Notification mit High Importance Channel
   *
   * Nutzt den "erinnerungen" Channel für hohe Priorität und
   * registriert Action Type für Deep Link Navigation.
   */
  private async sendTauriNotification(title: string, body: string, erinnerungId?: string, einsatzId?: string): Promise<NotificationResult> {
    try {
      const { sendNotification: tauriSendNotification } = await import('@tauri-apps/plugin-notification');
      const { ERINNERUNG_CHANNEL_ID, ERINNERUNG_ACTION_TYPE_ID } = await import('./notification-setup.service');

      tauriSendNotification({
        title,
        body,
        // High Importance Channel für prominente Anzeige
        channelId: ERINNERUNG_CHANNEL_ID,
        // Action Type für Klick-Handling mit Deep Link
        actionTypeId: ERINNERUNG_ACTION_TYPE_ID,
        // Extra-Daten fuer Deep Link Navigation (type-Feld fuer discriminated union)
        extra: erinnerungId && einsatzId ? { type: 'erinnerung', erinnerungId, einsatzId } : undefined,
        // Notification bleibt bis User interagiert (kein Auto-Dismiss)
        autoCancel: true,
      });

      logger.debug('Tauri Notification gesendet:', { title, body, erinnerungId, einsatzId });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      logger.error('Fehler beim Senden der Tauri Notification:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sendet Tauri Native Notification für kritische Plattform-Events (Story 1.2).
   *
   * Nutzt den Critical-Channel (High Importance) und registriert Action Type
   * für Deep-Link-Navigation via `url`.
   */
  private async sendTauriCriticalNotification(title: string, body: string, eventId: string, url?: string): Promise<NotificationResult> {
    try {
      const { sendNotification: tauriSendNotification } = await import('@tauri-apps/plugin-notification');
      const { CRITICAL_CHANNEL_ID, CRITICAL_ACTION_TYPE_ID } = await import('./notification-setup.service');

      // Plugin-API ist zwar synchron in den Types, kann aber in neueren
      // Versionen ein Promise zurückgeben. `await` verhindert unhandled
      // rejections und signalisiert Erfolg erst, wenn das OS die Notification
      // tatsächlich angenommen hat.
      await Promise.resolve(
        tauriSendNotification({
          title,
          body,
          channelId: CRITICAL_CHANNEL_ID,
          actionTypeId: CRITICAL_ACTION_TYPE_ID,
          extra: { type: 'critical', eventId, url },
          autoCancel: false,
        }),
      );

      logger.debug('Tauri Critical Notification gesendet:', { title, body, eventId, url });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      logger.error('Fehler beim Senden der Tauri Critical Notification:', error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sendet Tauri Native Notification für Befehle
   *
   * Nutzt den "befehle" Channel für hohe Priorität und
   * registriert Action Type für Deep Link Navigation zum Befehl.
   */
  private async sendTauriBefehlNotification(title: string, body: string, befehlId: string, einsatzId: string): Promise<NotificationResult> {
    try {
      const { sendNotification: tauriSendNotification } = await import('@tauri-apps/plugin-notification');
      const { BEFEHL_CHANNEL_ID, BEFEHL_ACTION_TYPE_ID } = await import('./notification-setup.service');

      tauriSendNotification({
        title,
        body,
        channelId: BEFEHL_CHANNEL_ID,
        actionTypeId: BEFEHL_ACTION_TYPE_ID,
        extra: { type: 'befehl', befehlId, einsatzId },
        autoCancel: true,
      });

      logger.debug('Tauri Befehl Notification gesendet:', { title, body, befehlId, einsatzId });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      logger.error('Fehler beim Senden der Tauri Befehl Notification:', error);

      return { success: false, error: errorMessage };
    }
  }

  // ===================
  // Web Implementation
  // ===================

  /**
   * Prüft Web Notification Permission
   */
  private checkWebPermission(): NotificationPermissionStatus {
    if (!('Notification' in window)) {
      this.permissionStatus = 'not-supported';
      return this.permissionStatus;
    }

    switch (Notification.permission) {
      case 'granted':
        this.permissionStatus = 'granted';
        break;
      case 'denied':
        this.permissionStatus = 'denied';
        break;
      default:
        this.permissionStatus = 'unknown';
    }

    logger.debug('Web Notification Permission:', this.permissionStatus);
    return this.permissionStatus;
  }

  /**
   * Fordert Web Notification Permission an
   */
  private async requestWebPermission(): Promise<NotificationPermissionStatus> {
    if (!('Notification' in window)) {
      this.permissionStatus = 'not-supported';
      return this.permissionStatus;
    }

    try {
      const result = await Notification.requestPermission();

      switch (result) {
        case 'granted':
          this.permissionStatus = 'granted';
          break;
        case 'denied':
          this.permissionStatus = 'denied';
          break;
        default:
          this.permissionStatus = 'unknown';
      }

      logger.debug('Web Notification Permission angefordert:', this.permissionStatus);
      return this.permissionStatus;
    } catch (error) {
      logger.error('Fehler beim Anfordern der Web Notification Permission:', error);
      this.permissionStatus = 'unknown';
      return this.permissionStatus;
    }
  }

  /**
   * Sendet Web Notification für kritische Plattform-Events (Story 1.2).
   *
   * Nutzt `tag: eventId` für Replace-Semantik bei doppelter Zustellung und
   * `requireInteraction: true`, damit der User das Event nicht übersieht.
   */
  private async sendWebCriticalNotification(title: string, body: string, eventId: string, url?: string): Promise<NotificationResult> {
    try {
      if (typeof Notification === 'undefined') {
        return { success: false, error: 'Web Notifications nicht verfügbar' };
      }

      const safeUrl = this.isSafeSameOriginUrl(url) ? url : undefined;

      // Chrome/Edge werfen `TypeError: Illegal constructor` bei `new Notification(...)`,
      // wenn ein ServiceWorker die Page kontrolliert. In dem Fall lieber die
      // SW-Registration-API nutzen (dieselbe, die auch der Background-Push ruft).
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          tag: eventId,
          requireInteraction: true,
          data: { eventId, url: safeUrl },
        });
        logger.debug('Web Critical Notification via SW gesendet:', { title, body, eventId, url: safeUrl });
        return { success: true };
      }

      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: eventId,
        requireInteraction: true,
      });

      notification.onclick = () => {
        if (typeof window === 'undefined') {
          return;
        }
        window.focus();
        if (safeUrl) {
          window.location.href = safeUrl;
        }
      };

      logger.debug('Web Critical Notification gesendet:', { title, body, eventId, url: safeUrl });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      logger.error('Fehler beim Senden der Web Critical Notification:', error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Prüft, ob eine URL für `window.location.href` sicher ist (same-origin, http/https).
   * Verwirft `javascript:`, `data:`, protocol-relative (`//evil.com`) und Cross-Origin.
   * Review-Follow-up Story 1.2 (Open-Redirect/XSS-Guard vor Notification-Click-Navigation).
   */
  private isSafeSameOriginUrl(url: string | undefined): url is string {
    if (!url || typeof url !== 'string') {
      return false;
    }
    if (url.startsWith('//')) {
      return false;
    }
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      return parsed.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Sendet Web Notification für Befehle
   *
   * Nutzt eindeutigen Tag um Erinnerung- und Befehl-Notifications zu trennen.
   */
  private sendWebBefehlNotification(title: string, body: string, befehlId: string, einsatzId?: string): NotificationResult {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `befehl-${befehlId}`,
        requireInteraction: true,
      });

      // Klick auf Notification navigiert zur Befehlsdetail-Ansicht (AC4)
      if (einsatzId) {
        notification.onclick = () => {
          window.focus();
          this.navigateToBefehl(einsatzId, befehlId);
        };
      }

      logger.debug('Web Befehl Notification gesendet:', { title, body, befehlId, einsatzId });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      logger.error('Fehler beim Senden der Web Befehl Notification:', error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sendet Web Notification
   */
  private sendWebNotification(title: string, body: string, icon?: string): NotificationResult {
    try {
      const notification = new Notification(title, {
        body,
        icon: icon ?? '/favicon.ico',
        tag: 'erinnerung', // Verhindert Duplikate
        requireInteraction: false,
      });

      // Auto-close nach 5 Sekunden
      setTimeout(() => {
        notification.close();
      }, 5000);

      logger.debug('Web Notification gesendet:', { title, body });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      logger.error('Fehler beim Senden der Web Notification:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// Singleton-Instanz exportieren
const notificationService = new NotificationService();

export { notificationService, NotificationService };

// Named Exports für einfachere Verwendung
export const checkNotificationPermission = () => notificationService.checkPermission();
export const requestNotificationPermission = () => notificationService.requestPermission();
export const sendNotification = (options: SendNotificationOptions) => notificationService.send(options);
export const sendErinnerungNotification = (title: string, erinnerungId?: string, einsatzId?: string) => notificationService.sendErinnerungNotification(title, erinnerungId, einsatzId);
export const sendIntensifiedNotification = (title: string, erinnerungId?: string, einsatzId?: string) => notificationService.sendIntensifiedNotification(title, erinnerungId, einsatzId);
export const sendAssignmentNotification = (title: string, assignedByName: string, erinnerungId?: string, einsatzId?: string) =>
  notificationService.sendAssignmentNotification(title, assignedByName, erinnerungId, einsatzId);
export const isNotificationSupported = () => notificationService.isSupported();
export const sendBefehlNotification = (options: BefehlNotificationOptions) => notificationService.sendBefehlNotification(options);
export const sendCriticalNotification = (options: CriticalNotificationOptions) => notificationService.sendCriticalNotification(options);
