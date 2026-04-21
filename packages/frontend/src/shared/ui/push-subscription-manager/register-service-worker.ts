import { isTauri } from '@tauri-apps/api/core';
import { logger } from '@/shared/lib/logger';

/**
 * Registriert den Plattform-Service-Worker (Story 1.2 AC1).
 *
 * - Tauri: Early-Return `null` — Tauri-Webviews bekommen keine Web-Push-Events,
 *   die Notifications laufen über `@tauri-apps/plugin-notification` (AC2).
 * - Browser ohne Service-Worker-Support (z. B. Safari < 16): Early-Return `null`.
 * - Fehler werden `logger.warn` geschrieben, NICHT als User-Toast (Zero-Toast).
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isTauri()) {
    logger.debug('[push] skip service worker registration in Tauri runtime');
    return null;
  }

  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    logger.warn('[push] service worker not supported in this browser');
    return null;
  }

  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const registration = await navigator.serviceWorker.ready;
    logger.info('[push] service worker ready', { scope: registration.scope });
    return registration;
  } catch (error) {
    logger.warn('[push] service worker registration failed', { error });
    return null;
  }
}
