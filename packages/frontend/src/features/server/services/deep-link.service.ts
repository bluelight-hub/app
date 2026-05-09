/**
 * Deep Link Service
 *
 * Verwaltet Deep Link Integration für Desktop App.
 * Registriert Tauri Deep Link Listener und emittiert Events bei eingehenden Links.
 *
 * Unterstützt Cold Start (App geschlossen) und Warm Start (App läuft).
 */

import type { DeepLinkParams, DeepLinkEvent, EntityDeepLinkParams } from '../types/deep-link';
import { DeepLinkError } from '../types/deep-link';
import { isTauri } from '@tauri-apps/api/core';
import { sanitizeInternalRedirectPath } from '@/shared/lib/navigation/router-redirect';

/**
 * Event Callback Type für Deep Link Events
 */
type DeepLinkCallback = (params: DeepLinkParams) => void;
type EntityDeepLinkCallback = (params: EntityDeepLinkParams) => void;
type DeepLinkErrorCallback = (error: DeepLinkError, message: string) => void;

type ParsedDeepLink = { kind: 'invite'; params: DeepLinkParams } | { kind: 'entity'; params: EntityDeepLinkParams | null } | null;

/**
 * Deep Link Service Singleton
 *
 * Pattern: Event Emitter mit Tauri Plugin Integration
 * Lifecycle: Initialisiert beim ersten Aufruf (Cold Start)
 */
export class DeepLinkService {
  private static instance: DeepLinkService | null = null;
  private listeners: Map<DeepLinkEvent, Array<DeepLinkCallback | EntityDeepLinkCallback | DeepLinkErrorCallback>> = new Map();
  private isInitialized = false;

  /**
   * Private Constructor für Singleton Pattern
   */
  private constructor() {
    // Singleton - keine direkte Instanziierung
  }

  /**
   * Singleton-Instanz des DeepLinkService.
   *
   * Verwendet Singleton Pattern um sicherzustellen, dass nur eine
   * Service-Instanz existiert, die Event-Listener zentral verwaltet.
   * Dies verhindert Memory Leaks durch doppelte Listener-Registrierungen.
   */
  public static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  /**
   * Initialisiert Deep Link Listener
   *
   * WICHTIG: Nur einmal aufrufen (App Lifecycle Hook)
   * Registriert Tauri Plugin für Cold Start und Warm Start.
   * Im Browser-Modus wird die Initialisierung übersprungen.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Skip initialization in browser mode (Tauri APIs not available)
    if (!isTauri()) {
      this.isInitialized = true;
      return;
    }

    try {
      await this.registerListeners();
      this.isInitialized = true;
      console.info('[DeepLinkService] Initialized successfully');
    } catch (error) {
      console.error('[DeepLinkService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Registriert Tauri Deep Link Event Listener
   *
   * Callback wird ausgelöst bei:
   * - Cold Start: App wird mit Deep Link gestartet (via getCurrent())
   * - Warm Start: Deep Link während App läuft (via onOpenUrl())
   */
  private async registerListeners(): Promise<void> {
    // Dynamic import to avoid errors in browser mode
    const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

    // 1. Check for Cold Start Deep Links
    const currentUrls = await getCurrent();
    if (currentUrls && currentUrls.length > 0) {
      this.handleDeepLinkUrls(currentUrls);
    }

    // 2. Register Warm Start Listener
    await onOpenUrl((urls: string[]) => {
      this.handleDeepLinkUrls(urls);
    });
  }

  /**
   * Verarbeitet Deep Link URLs (Cold + Warm Start)
   *
   * @param urls - Array von Deep Link URLs
   */
  private handleDeepLinkUrls(urls: string[]): void {
    if (!urls || urls.length === 0) {
      this.emitError(DeepLinkError.PARSE_ERROR, 'No URLs received from deep link');
      return;
    }

    const url = urls[0];
    console.info('[DeepLinkService] Received deep link:', url);

    const parsed = this.parseUrl(url);

    if (!parsed) {
      this.emitError(DeepLinkError.INVALID_PROTOCOL, `Invalid deep link protocol: ${url}`);
      return;
    }

    if (parsed.kind === 'entity') {
      if (!parsed.params) {
        this.emitError(DeepLinkError.INVALID_TARGET, 'Entity deep link target is not an internal Einsatz path');
        return;
      }
      this.emit('entity-link-received', parsed.params);
      return;
    }

    const { params } = parsed;

    // Parameter Validation (IMMER zuerst!)
    if (!params.serverUrl || !params.inviteCode) {
      this.emitError(DeepLinkError.MISSING_PARAMETERS, 'Missing required parameters (url or invite)');
      return;
    }

    // Client-side Expiry Validation
    if (params.expiresAt) {
      const expiryResult = this.validateExpiry(params.expiresAt);
      if (!expiryResult.valid) {
        this.emitError(DeepLinkError.EXPIRED_LINK, expiryResult.error || 'Deep link has expired');
        return;
      }
    }

    // Emit Event
    this.emit('deep-link-received', params);
  }

  /**
   * Parst Deep Link URL
   *
   * Format: bluelight://connect?url=...&invite=...&expires=...
   *
   * @param url - Deep Link URL
   * @returns Parsed Parameter oder null bei ungültigem Protocol
   */
  private parseUrl(url: string): ParsedDeepLink {
    try {
      const urlObj = new URL(url);

      // Protocol Validation
      if (urlObj.protocol !== 'bluelight:') {
        return null;
      }

      if (urlObj.hostname === 'open') {
        return {
          kind: 'entity',
          params: this.parseEntityOpenUrl(urlObj),
        };
      }

      return {
        kind: 'invite',
        params: {
          serverUrl: urlObj.searchParams.get('url'),
          inviteCode: urlObj.searchParams.get('invite'),
          expiresAt: urlObj.searchParams.get('expires'),
        },
      };
    } catch (error) {
      console.error('[DeepLinkService] URL parse error:', error);
      return null;
    }
  }

  private parseEntityOpenUrl(urlObj: URL): EntityDeepLinkParams | null {
    const path = this.sanitizeEntityPath(urlObj.searchParams.get('path'));
    return path ? { path } : null;
  }

  private sanitizeEntityPath(path: string | null): string | null {
    if (typeof path !== 'string') {
      return null;
    }

    const safePath = sanitizeInternalRedirectPath(path);
    if (!safePath?.startsWith('/app/einsatz/')) {
      return null;
    }

    return safePath;
  }

  /**
   * Validiert Expiry Timestamp
   *
   * @param expiresAt - ISO 8601 Timestamp
   * @returns Validation Result mit error message
   */
  private validateExpiry(expiresAt: string): {
    valid: boolean;
    error?: string;
  } {
    try {
      const expiryDate = new Date(expiresAt);

      // Prüfe auf Invalid Date (z.B. "invalid-date")
      if (Number.isNaN(expiryDate.getTime())) {
        return {
          valid: false,
          error: 'Invalid expiry date format',
        };
      }

      const now = new Date();
      if (expiryDate < now) {
        return {
          valid: false,
          error: 'Deep link has expired',
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Failed to parse expiry date',
      };
    }
  }

  /**
   * Registriert Event Listener für Deep Link Events.
   *
   * Verwendet Pub/Sub Pattern für lose Kopplung zwischen Service
   * und UI-Komponenten. Dies ermöglicht mehrere unabhängige Subscriber
   * (z.B. Notifications, Analytics, UI-Updates).
   *
   * @param event - Event Name
   * @param callback - Callback Function
   */
  public on(event: 'deep-link-received', callback: DeepLinkCallback): void;
  public on(event: 'entity-link-received', callback: EntityDeepLinkCallback): void;
  public on(event: 'deep-link-error', callback: DeepLinkErrorCallback): void;
  public on(event: DeepLinkEvent, callback: DeepLinkCallback | EntityDeepLinkCallback | DeepLinkErrorCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Entfernt Event Listener zur Vermeidung von Memory Leaks.
   *
   * Ohne callback-Parameter werden alle Listener für das Event entfernt.
   * Mit callback-Parameter wird nur der spezifische Listener entfernt.
   * WICHTIG: Komponenten müssen Listener in cleanup (useEffect return) entfernen!
   *
   * @param event - Event Name
   * @param callback - Callback Function (optional, entfernt alle wenn nicht angegeben)
   */
  public off(event: 'deep-link-received', callback?: DeepLinkCallback): void;
  public off(event: 'entity-link-received', callback?: EntityDeepLinkCallback): void;
  public off(event: 'deep-link-error', callback?: DeepLinkErrorCallback): void;
  public off(event: DeepLinkEvent, callback?: DeepLinkCallback | EntityDeepLinkCallback | DeepLinkErrorCallback): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Event emittieren
   *
   * @param event - Event Name
   * @param params - Event Parameter
   */
  private emit(event: 'deep-link-received', params: DeepLinkParams): void;
  private emit(event: 'entity-link-received', params: EntityDeepLinkParams): void;
  private emit(event: 'deep-link-received' | 'entity-link-received', params: DeepLinkParams | EntityDeepLinkParams): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const callback of eventListeners) {
        (callback as DeepLinkCallback | EntityDeepLinkCallback)(params as DeepLinkParams & EntityDeepLinkParams);
      }
    }
  }

  /**
   * Error Event emittieren
   *
   * @param error - Error Type
   * @param message - Error Message
   */
  private emitError(error: DeepLinkError, message: string): void {
    const eventListeners = this.listeners.get('deep-link-error');
    if (eventListeners) {
      for (const callback of eventListeners) {
        (callback as DeepLinkErrorCallback)(error, message);
      }
    }
  }

  /**
   * Setzt Service-Instanz zurück (nur für Tests!).
   *
   * Erlaubt Test-Isolation durch Zurücksetzen des Singleton-State.
   * WARNUNG: Nur in Test-Umgebung verwenden! Produktions-Code sollte
   * niemals den Service zurücksetzen, da dies aktive Listener zerstört.
   */
  public static reset(): void {
    if (DeepLinkService.instance) {
      DeepLinkService.instance.listeners.clear();
      DeepLinkService.instance.isInitialized = false;
      DeepLinkService.instance = null;
    }
  }

  /**
   * Emittiert Events manuell für Test-Zwecke.
   *
   * Bypass für Tauri Plugin Mocking. Erlaubt Tests, Deep Link Events
   * ohne tatsächliches OS-Deep-Link-Triggering zu simulieren.
   * WARNUNG: Nur in Test-Umgebung verwenden! Produktions-Code sollte
   * niemals Events manuell emittieren.
   */
  public emitForTesting(event: 'deep-link-received', params: DeepLinkParams): void;
  public emitForTesting(event: 'entity-link-received', params: EntityDeepLinkParams): void;
  public emitForTesting(event: 'deep-link-error', error: DeepLinkError, message: string): void;
  public emitForTesting(event: DeepLinkEvent, ...args: [DeepLinkParams] | [EntityDeepLinkParams] | [DeepLinkError, string]): void {
    if (event === 'deep-link-received' || event === 'entity-link-received') {
      this.emit(event, args[0] as DeepLinkParams & EntityDeepLinkParams);
    } else if (event === 'deep-link-error') {
      this.emitError(args[0] as DeepLinkError, args[1] as string);
    }
  }
}

/**
 * Singleton Instance Export (Convenience)
 */
export const deepLinkService = DeepLinkService.getInstance();
