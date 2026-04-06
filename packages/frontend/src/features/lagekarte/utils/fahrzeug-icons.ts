/**
 * Fahrzeug POI Icon Utilities für Lagekarte (MapLibre GL JS)
 *
 * Erstellt HTML-Strings für Einsatzfahrzeug-Marker mit:
 * - Fahrzeugtyp-spezifischen Emojis
 * - Dynamischer statusFarbe als Hintergrund
 */

/**
 * Mapping von Fahrzeugtyp-Codes zu Emojis
 */
const FAHRZEUG_EMOJIS: Record<string, string> = {
  HLF: '\uD83D\uDE92',
  LF: '\uD83D\uDE92',
  TLF: '\uD83D\uDE92',
  DLK: '\uD83E\uDE9C',
  RW: '\uD83D\uDE9A',
  GW: '\uD83D\uDE9A',
  'GW-L': '\uD83D\uDE9A',
  'GW-G': '\uD83D\uDE9A',
  'GW-A': '\uD83D\uDE9A',
  'GW-T': '\uD83D\uDE9A',
  ELW: '\uD83D\uDCE1',
  'ELW 1': '\uD83D\uDCE1',
  'ELW 2': '\uD83D\uDCE1',
  KDOW: '\uD83D\uDE97',
  MTW: '\uD83D\uDE90',
  RTW: '\uD83D\uDE91',
  KTW: '\uD83D\uDE91',
  NEF: '\uD83C\uDFE5',
  NAW: '\uD83C\uDFE5',
  ITW: '\uD83D\uDE91',
  MZB: '\uD83D\uDEA4',
  BOOT: '\uD83D\uDEA4',
  LKW: '\uD83D\uDE9A',
  PKW: '\uD83D\uDE97',
  UNKNOWN: '\uD83D\uDE97',
};

/**
 * Holt das passende Emoji für einen Fahrzeugtyp-Code
 */
export const getFahrzeugEmoji = (fahrzeugtypCode: string): string => {
  if (FAHRZEUG_EMOJIS[fahrzeugtypCode]) {
    return FAHRZEUG_EMOJIS[fahrzeugtypCode];
  }

  const prefix = fahrzeugtypCode.split(/[\s-]/)[0];
  if (prefix && FAHRZEUG_EMOJIS[prefix]) {
    return FAHRZEUG_EMOJIS[prefix];
  }

  return FAHRZEUG_EMOJIS.UNKNOWN;
};

const DEFAULT_STATUS_FARBE = '#6B7280';

/**
 * Generiert einen HTML-String für ein Fahrzeug-Marker-Icon
 *
 * Wird als children eines react-map-gl <Marker> verwendet.
 */
export const createFahrzeugIconHtml = (fahrzeugtypCode: string, statusFarbe: string | object | null): string => {
  const emoji = getFahrzeugEmoji(fahrzeugtypCode);
  const farbe = typeof statusFarbe === 'string' ? statusFarbe : DEFAULT_STATUS_FARBE;

  return `<div style="
    background-color: ${farbe};
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    font-size: 16px;
    cursor: pointer;
  ">${emoji}</div>`;
};
