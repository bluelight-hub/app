import { z } from 'zod';

/**
 * Zod-Schema für die Validierung von Server-URLs.
 *
 * Validiert URLs für Backend-Server-Verbindungen.
 *
 * Regeln:
 * - Muss eine gültige URL sein
 * - Erlaubt http:// und https://
 * - Für Entwicklung: localhost und 127.0.0.1 erlaubt
 *
 * WICHTIG: Dieses Schema wird im Frontend für Server-Setup verwendet.
 */
export const serverUrlSchema = z
  .string()
  .url('Ungültige Server-URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Erlaube nur http/https
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'Server-URL muss mit http:// oder https:// beginnen',
    },
  );

/**
 * TypeScript-Typ für Server-URLs
 */
export type ServerUrl = z.infer<typeof serverUrlSchema>;
