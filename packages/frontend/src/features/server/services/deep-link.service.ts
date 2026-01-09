/**
 * Deep Link Service
 *
 * Verwaltet Deep Link Integration für Desktop App.
 * Registriert Tauri Deep Link Listener und emittiert Events bei eingehenden Links.
 *
 * Unterstützt Cold Start (App geschlossen) und Warm Start (App läuft).
 */

import { register } from '@tauri-apps/plugin-deep-link';
import type { DeepLinkParams, DeepLinkEvent } from '../types/deep-link';
import { DeepLinkError } from '../types/deep-link';

/**
 * Event Callback Type für Deep Link Events
 */
type DeepLinkCallback = (params: DeepLinkParams) => void;
type DeepLinkErrorCallback = (error: DeepLinkError, message: string) => void;

/**
 * Deep Link Service Singleton
 *
 * Pattern: Event Emitter mit Tauri Plugin Integration
 * Lifecycle: Initialisiert beim ersten Aufruf (Cold Start)
 */
export class DeepLinkService {
  private static instance: DeepLinkService | null = null;
  private listeners: Map<DeepLinkEvent, Array<DeepLinkCallback | DeepLinkErrorCallback>> = new Map();
  private isInitialized = false;

  /**
   * Private Constructor für Singleton Pattern
   */
  private constructor() {
    // Singleton - keine direkte Instanziierung
  }

  /**
   * Singleton Instance Getter
   *
   * Lazy Initialization: Registriert Listener beim ersten Aufruf.
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
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[DeepLinkService] Already initialized, skipping...');
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
   * - Cold Start: App wird mit Deep Link gestartet
   * - Warm Start: Deep Link während App läuft
   */
  private async registerListeners(): Promise<void> {
    await register((urls) => {
      if (!urls || urls.length === 0) {
        this.emitError(DeepLinkError.PARSE_ERROR, 'No URLs received from deep link');
        return;
      }

      const url = urls[0];
      console.info('[DeepLinkService] Received deep link:', url);

      const params = this.parseUrl(url);

      if (!params) {
        this.emitError(DeepLinkError.INVALID_PROTOCOL, `Invalid deep link protocol: ${url}`);
        return;
      }

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
    });
  }

  /**
   * Parst Deep Link URL
   *
   * Format: bluelight://connect?url=...&invite=...&expires=...
   *
   * @param url - Deep Link URL
   * @returns Parsed Parameter oder null bei ungültigem Protocol
   */
  private parseUrl(url: string): DeepLinkParams | null {
    try {
      const urlObj = new URL(url);

      // Protocol Validation
      if (urlObj.protocol !== 'bluelight:') {
        return null;
      }

      return {
        serverUrl: urlObj.searchParams.get('url'),
        inviteCode: urlObj.searchParams.get('invite'),
        expiresAt: urlObj.searchParams.get('expires'),
      };
    } catch (error) {
      console.error('[DeepLinkService] URL parse error:', error);
      return null;
    }
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
   * Event Listener registrieren
   *
   * @param event - Event Name
   * @param callback - Callback Function
   */
  public on(event: 'deep-link-received', callback: DeepLinkCallback): void;
  public on(event: 'deep-link-error', callback: DeepLinkErrorCallback): void;
  public on(event: DeepLinkEvent, callback: DeepLinkCallback | DeepLinkErrorCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Event Listener entfernen
   *
   * @param event - Event Name
   * @param callback - Callback Function (optional, entfernt alle wenn nicht angegeben)
   */
  public off(event: DeepLinkEvent, callback?: DeepLinkCallback): void {
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
  private emit(event: 'deep-link-received', params: DeepLinkParams): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const callback of eventListeners) {
        (callback as DeepLinkCallback)(params);
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
   * Service zurücksetzen (nur für Tests!)
   *
   * WARNUNG: Nur in Test-Umgebung verwenden!
   */
  public static reset(): void {
    if (DeepLinkService.instance) {
      DeepLinkService.instance.listeners.clear();
      DeepLinkService.instance.isInitialized = false;
      DeepLinkService.instance = null;
    }
  }
}

/**
 * Singleton Instance Export (Convenience)
 */
export const deepLinkService = DeepLinkService.getInstance();
