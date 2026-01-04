/**
 * Fahrzeug POI Icon Utilities fuer Lagekarte
 *
 * Story 8.1: Fahrzeuge als GeoJSON POIs
 *
 * Erstellt Leaflet DivIcons fuer Einsatzfahrzeuge mit:
 * - Fahrzeugtyp-spezifischen Emojis
 * - Dynamischer statusFarbe als Hintergrund
 * - Responsive Groesse (32x32px)
 */

import L from 'leaflet';

/**
 * Mapping von Fahrzeugtyp-Codes zu Emojis
 *
 * @remarks
 * - HLF/LF: Loeschfahrzeuge
 * - DLK: Drehleiter
 * - TLF: Tankloesch-Fahrzeug
 * - RTW/KTW: Rettungsdienst
 * - NEF: Notarzt-Einsatzfahrzeug
 * - ELW: Einsatzleitwagen
 * - MTW: Mannschaftstransportwagen
 * - GW: Geraetewagen (alle Varianten)
 * - UNKNOWN: Fallback
 */
const FAHRZEUG_EMOJIS: Record<string, string> = {
  // Feuerwehr
  HLF: '\uD83D\uDE92', // Fire Engine
  LF: '\uD83D\uDE92',
  TLF: '\uD83D\uDE92',
  DLK: '\uD83E\uDE9C', // Ladder
  RW: '\uD83D\uDE9A', // Truck
  GW: '\uD83D\uDE9A',
  'GW-L': '\uD83D\uDE9A',
  'GW-G': '\uD83D\uDE9A',
  'GW-A': '\uD83D\uDE9A',
  'GW-T': '\uD83D\uDE9A',
  ELW: '\uD83D\uDCE1', // Satellite Antenna
  'ELW 1': '\uD83D\uDCE1',
  'ELW 2': '\uD83D\uDCE1',
  KDOW: '\uD83D\uDE97', // Car
  MTW: '\uD83D\uDE90', // Minibus
  // Rettungsdienst
  RTW: '\uD83D\uDE91', // Ambulance
  KTW: '\uD83D\uDE91',
  NEF: '\uD83C\uDFE5', // Hospital
  NAW: '\uD83C\uDFE5',
  ITW: '\uD83D\uDE91',
  // THW / Sonstige
  MZB: '\uD83D\uDEA4', // Speedboat
  BOOT: '\uD83D\uDEA4',
  LKW: '\uD83D\uDE9A',
  PKW: '\uD83D\uDE97',
  UNKNOWN: '\uD83D\uDE97', // Car (Fallback)
};

/**
 * Holt das passende Emoji fuer einen Fahrzeugtyp-Code.
 *
 * @param fahrzeugtypCode - Der Fahrzeugtyp-Code (z.B. "HLF", "RTW")
 * @returns Emoji String
 */
export const getFahrzeugEmoji = (fahrzeugtypCode: string): string => {
  // Exakten Match versuchen
  if (FAHRZEUG_EMOJIS[fahrzeugtypCode]) {
    return FAHRZEUG_EMOJIS[fahrzeugtypCode];
  }

  // Prefix-Match versuchen (z.B. "HLF 20" -> "HLF")
  const prefix = fahrzeugtypCode.split(/[\s-]/)[0];
  if (prefix && FAHRZEUG_EMOJIS[prefix]) {
    return FAHRZEUG_EMOJIS[prefix];
  }

  return FAHRZEUG_EMOJIS.UNKNOWN;
};

/**
 * Default-Farbe wenn keine statusFarbe vorhanden
 */
const DEFAULT_STATUS_FARBE = '#6B7280'; // Tailwind gray-500

/**
 * Generiert ein Leaflet DivIcon fuer ein Einsatzfahrzeug.
 *
 * @param fahrzeugtypCode - Fahrzeugtyp-Code fuer Icon-Auswahl (z.B. "HLF", "RTW")
 * @param statusFarbe - Hex-Farbe des FMS-Status (z.B. "#10B981")
 * @returns Leaflet DivIcon mit Fahrzeug-Emoji und Status-Hintergrund
 *
 * @remarks
 * - Icon-Groesse: 32x32px
 * - Runder Hintergrund mit Status-Farbe
 * - Weisser Border fuer Kontrast
 * - Shadow fuer bessere Sichtbarkeit auf der Karte
 *
 * @example
 * ```tsx
 * const icon = createFahrzeugIcon('HLF', '#10B981');
 * <Marker position={[lat, lng]} icon={icon} />
 * ```
 */
export const createFahrzeugIcon = (fahrzeugtypCode: string, statusFarbe: string | object | null): L.DivIcon => {
  const emoji = getFahrzeugEmoji(fahrzeugtypCode);

  // statusFarbe kann string, object oder null sein (siehe KraeftePoisPropertiesDto)
  const farbe = typeof statusFarbe === 'string' ? statusFarbe : DEFAULT_STATUS_FARBE;

  return L.divIcon({
    className: 'fahrzeug-poi-icon',
    html: `
      <div style="
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
      ">
        ${emoji}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16], // Zentrum des Icons
    popupAnchor: [0, -16], // Popup oberhalb des Icons
  });
};
