/**
 * Validiert eine URL aus dem Push-/Critical-Notification-Payload (Story 1.2 Review).
 *
 * Akzeptiert nur:
 * - Same-origin absolute URLs (`http://`, `https://`)
 * - Relative Pfade (`/foo/bar`, `./foo`)
 *
 * Verwirft `javascript:`, `data:`, protocol-relative (`//evil.com`) und
 * Cross-Origin-URLs. Wird vor `window.location.href = ...` und vor
 * Sonner-Toast-Action-Navigations aufgerufen, um Open-Redirect/XSS zu verhindern.
 */
export function isSafeNotificationUrl(url: string | undefined | null): url is string {
  if (!url || typeof url !== 'string') {
    return false;
  }
  if (url.startsWith('//')) {
    return false;
  }
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://localhost';
  try {
    const parsed = new URL(url, origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return parsed.origin === origin;
  } catch {
    return false;
  }
}
