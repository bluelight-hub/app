/**
 * Validiert und sanitized Screenshot-URLs (XSS-Prevention)
 *
 * **Security:**
 * - Whitelist-basierte Validierung
 * - Nur URLs die mit `/uploads/lagekarte/` starten sind erlaubt
 * - Verhindert XSS-Angriffe via `javascript:`, `data:`, etc.
 *
 * **Usage:**
 * ```ts
 * const validatedUrl = validateScreenshotUrl(url);
 * if (validatedUrl) {
 *   // URL ist sicher zu verwenden
 * }
 * ```
 *
 * @param url - Screenshot-URL zu validieren
 * @returns Validierte URL oder null wenn unsicher
 * @throws Error wenn URL nicht den Whitelist-Kriterien entspricht
 */
export function validateScreenshotUrl(url: string | null | undefined): string {
  // Null/undefined check
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid screenshot URL: URL is null or not a string');
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Empty check
  if (trimmedUrl === '') {
    throw new Error('Invalid screenshot URL: URL is empty');
  }

  // Whitelist: Nur URLs die mit /uploads/lagekarte/ starten
  if (!trimmedUrl.startsWith('/uploads/lagekarte/')) {
    throw new Error(`Invalid screenshot URL: URL must start with /uploads/lagekarte/ (got: ${trimmedUrl})`);
  }

  // Path traversal prevention (zusätzliche Sicherheit)
  if (trimmedUrl.includes('..')) {
    throw new Error('Invalid screenshot URL: Path traversal detected (..)');
  }

  // Filename validation (nur alphanumerisch, underscore, hyphen, dot)
  const filename = trimmedUrl.split('/').pop();
  if (!filename || !/^[a-zA-Z0-9_-]+\.\w+$/.test(filename)) {
    throw new Error(`Invalid screenshot URL: Invalid filename format (got: ${filename})`);
  }

  // URL ist sicher
  return trimmedUrl;
}

/**
 * Safe Wrapper für validateScreenshotUrl (gibt null zurück statt Error zu werfen)
 *
 * **Usage:**
 * ```ts
 * const url = safeValidateScreenshotUrl(maybeUnsafeUrl);
 * if (url) {
 *   // URL ist sicher
 * } else {
 *   // URL ist unsicher oder ungültig
 * }
 * ```
 *
 * @param url - Screenshot-URL zu validieren
 * @returns Validierte URL oder null wenn unsicher
 */
export function safeValidateScreenshotUrl(url: string | null | undefined): string | null {
  try {
    return validateScreenshotUrl(url);
  } catch {
    return null;
  }
}
