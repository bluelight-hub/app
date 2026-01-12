import { createConsola } from 'consola/browser';

/**
 * Zentrale Logger-Instanz für das Frontend.
 *
 * Nutzt consola/browser für korrekte Browser-Formatierung ohne ANSI-Codes.
 */
export const logger = createConsola({
  level: import.meta.env.PROD ? 3 : 5,
});
