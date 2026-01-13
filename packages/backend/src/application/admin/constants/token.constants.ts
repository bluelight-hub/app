/**
 * Konstanten fuer Access-Token Handling.
 */

/**
 * Token-Prefix fuer Server Access Tokens.
 * Format: blh_ + cuid2 (24 Zeichen) = 28 Zeichen total.
 */
export const TOKEN_PREFIX = 'blh_';

/**
 * Laenge des Token-Prefix fuer Anzeige/Logging.
 * Format: blh_ + 8 Zeichen = 12 Zeichen.
 */
export const TOKEN_PREFIX_DISPLAY_LENGTH = 12;
